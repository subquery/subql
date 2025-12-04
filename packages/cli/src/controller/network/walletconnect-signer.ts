// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Signer} from '@ethersproject/abstract-signer';
import {BigNumber} from '@ethersproject/bignumber';
import {hexlify} from '@ethersproject/bytes';
import {Deferrable, resolveProperties} from '@ethersproject/properties';
import {JsonRpcProvider, TransactionRequest, TransactionResponse} from '@ethersproject/providers';
import {NETWORKS_CONFIG_INFO} from '@subql/network-config';
import SignClient from '@walletconnect/sign-client';
import {SessionTypes} from '@walletconnect/types';
import {getSdkError} from '@walletconnect/utils';
import * as qrcode from 'qrcode-terminal';
import {Logger} from '../../adapters/utils';
import {WALLET_CONNECT_STORE_PATH} from '../../constants';
import {WALLET_DOMAIN} from './constants';
import {JSONFileStorage} from './json-file-store';

export const NO_EXISTING_CONN_ERROR = new Error(
  'No existing WalletConnect session found. Please connect your wallet first.'
);

const chainIds = Object.values(NETWORKS_CONFIG_INFO).reduce((acc, config) => {
  if (config.chainId) {
    acc.push(`eip155:${config.chainId}`);
  }
  return acc;
}, [] as Array<`eip155:${string}`>);

export class WalletConnectSigner extends Signer {
  private signClient: SignClient | null = null;
  private session: SessionTypes.Struct | null = null;
  private account: string | null = null;

  constructor(
    readonly provider: JsonRpcProvider,
    readonly logger: Logger,
    private readonly allowNewConnect = false
  ) {
    super();
  }

  connect(provider: JsonRpcProvider): WalletConnectSigner {
    return this;
  }

  async closeConnection(): Promise<void> {
    if (this.signClient) {
      await this.signClient.core.relayer.transportClose();
    }
  }

  async getAddress(): Promise<string> {
    return this.initializeWalletConnect();
  }

  private async initializeWalletConnect(): Promise<string> {
    if (this.signClient && this.session && this.account) {
      return this.account;
    }

    // Initialize the Sign Client
    this.signClient = await SignClient.init({
      projectId: process.env.WALLETCONNECT_PROJECT_ID || 'c7ea561f79adc119587d163a68860570', // SubQuery public project ID
      metadata: {
        name: 'SubQuery CLI',
        description: 'SubQuery Command Line Interface',
        url: `https://${WALLET_DOMAIN}`,
        icons: ['https://subquery.network/favicon.ico'],
      },
      logger: 'silent', // Disable all logging
      storage: new JSONFileStorage(WALLET_CONNECT_STORE_PATH),
    });

    const chainId = `eip155:${this.provider.network.chainId}`;

    try {
      // Check for existing sessions
      const existingSessions = this.signClient.session.getAll();
      const compatibleSession = existingSessions.find((session) =>
        session.namespaces.eip155?.chains?.includes(chainId)
      );

      if (compatibleSession) {
        this.logger.debug('Using existing WalletConnect session');
        this.session = compatibleSession;
        this.account = compatibleSession.namespaces.eip155.accounts[0].split(':')[2];
        return this.account;
      }

      if (!this.allowNewConnect) {
        await this.signClient.core.relayer.transportClose();
        throw NO_EXISTING_CONN_ERROR;
      }

      // Create new session
      this.logger.debug('Creating new WalletConnect session...');
      const {approval, uri} = await this.signClient.connect({
        optionalNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction' /*'eth_sign', 'personal_sign', 'eth_signTypedData'*/,
            ],
            chains: chainIds,
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      });

      if (uri) {
        // Display QR code in terminal
        qrcode.generate(uri, {small: true}, (qrString) => {
          this.logger.info(`Scan this QR code with your wallet app:
${qrString}
Or copy and paste this URI into your wallet:
${uri}

`);
        });
      }

      // Wait for session approval
      this.logger.debug('Waiting for wallet connection...');
      this.session = await approval();
      this.logger.info('✅ Wallet connected successfully!');

      // Extract account address
      this.account = this.session.namespaces.eip155.accounts[0].split(':')[2];
      return this.account;
    } catch (error: any) {
      if (error.message?.includes('User rejected') || error.message?.includes('User disapproved')) {
        throw new Error('WalletConnect connection was rejected by user');
      }
      if (error === NO_EXISTING_CONN_ERROR) {
        throw error;
      }
      throw new Error(`WalletConnect initialization failed: ${error.message}`);
    }
  }

  async signMessage(message: string): Promise<string> {
    return this.runRequest<string>('personal_sign', [hexlify(Buffer.from(message, 'utf8')), this.account]);
  }

  async signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
    // Resolve all deferrable properties
    const resolved = await resolveProperties(transaction);

    // Fill in missing transaction fields
    const populatedTransaction = {
      from: this.account,
      to: resolved.to,
      value: resolved.value ? BigNumber.from(resolved.value).toHexString() : '0x0',
      data: resolved.data || '0x',
      gas: resolved.gasLimit ? BigNumber.from(resolved.gasLimit).toHexString() : undefined,
      gasPrice: resolved.gasPrice ? BigNumber.from(resolved.gasPrice).toHexString() : undefined,
      nonce: resolved.nonce ? BigNumber.from(resolved.nonce).toHexString() : undefined,
    };

    // Remove undefined fields
    const txParams = Object.fromEntries(
      Object.entries(populatedTransaction).filter(([_, value]) => value !== undefined)
    );

    const signedTx = await this.runRequest<string>('eth_signTransaction', [txParams]);
    return signedTx;
  }

  async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
    // Resolve all deferrable properties
    const resolved = await resolveProperties(transaction);

    // Fill in missing transaction fields
    const populatedTransaction = {
      from: this.account,
      to: resolved.to,
      value: resolved.value ? BigNumber.from(resolved.value).toHexString() : '0x0',
      data: resolved.data || '0x',
      gas: resolved.gasLimit ? BigNumber.from(resolved.gasLimit).toHexString() : undefined,
      gasPrice: resolved.gasPrice ? BigNumber.from(resolved.gasPrice).toHexString() : undefined,
      nonce: resolved.nonce ? BigNumber.from(resolved.nonce).toHexString() : undefined,
    };

    // Remove undefined fields
    const txParams = Object.fromEntries(
      Object.entries(populatedTransaction).filter(([_, value]) => value !== undefined)
    );

    // Estimate the gas, this is used to check if the tx will fail before being sent to the wallet
    await this.provider.estimateGas(txParams);

    const txHash = await this.runRequest<string>('eth_sendTransaction', [txParams]);

    // WARNING this is a workaround for WalletConnect and is not actually the full transaction.
    // The transaction is wrapped to provide the `.wait` method so we can wait for confirmation and get the receipt.
    return this.provider._wrapTransaction(
      {
        ...resolved,
        hash: txHash,
      } as any,
      txHash
    );
  }

  private async runRequest<T>(method: string, params: any[]): Promise<T> {
    await this.initializeWalletConnect();

    if (!this.signClient || !this.session || !this.account) {
      throw new Error('WalletConnect not initialized');
    }

    try {
      const result = await this.signClient.request<T>({
        topic: this.session.topic,
        chainId: `eip155:${this.provider.network.chainId}`,
        request: {
          method,
          params,
        },
      });

      return result;
    } catch (error: any) {
      if (error.code === getSdkError('USER_REJECTED').code || error.message?.includes('User rejected')) {
        throw new Error('Operation was rejected by user');
      }
      throw new Error(`Failed to send request: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.signClient && this.session) {
      try {
        await this.signClient.disconnect({
          topic: this.session.topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });
        this.logger.info('✅ WalletConnect session disconnected');
      } catch (error) {
        this.logger.warn(`Failed to disconnect WalletConnect session: ${error}`);
      }
    }

    this.signClient = null;
    this.session = null;
    this.account = null;
  }
}

// Global instance for session persistence
export const walletConnectSigner = {
  instance: null as WalletConnectSigner | null,

  getInstance(provider: JsonRpcProvider, logger: Logger, allowNewConnect = false): WalletConnectSigner {
    return (this.instance ??= new WalletConnectSigner(provider, logger, allowNewConnect));
  },

  async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
    }
  },
};
