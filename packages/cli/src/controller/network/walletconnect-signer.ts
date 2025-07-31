// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'node:fs';
import {Signer} from '@ethersproject/abstract-signer';
import {BigNumber} from '@ethersproject/bignumber';
import {hexlify} from '@ethersproject/bytes';
import {Deferrable, resolveProperties} from '@ethersproject/properties';
import {JsonRpcProvider, TransactionRequest, TransactionResponse} from '@ethersproject/providers';
import {NETWORKS_CONFIG_INFO} from '@subql/network-config';
import {IKeyValueStorage} from '@walletconnect/keyvaluestorage';
import SignClient from '@walletconnect/sign-client';
import {SessionTypes} from '@walletconnect/types';
import {getSdkError} from '@walletconnect/utils';
import * as qrcode from 'qrcode-terminal';
import {Logger} from '../../adapters/utils';
import {WALLET_CONNECT_STORE_PATH} from '../../constants';

export const NO_EXISTING_CONN_ERROR = new Error(
  'No existing WalletConnect session found. Please connect your wallet first.'
);

const chainIds = Object.values(NETWORKS_CONFIG_INFO).reduce((acc, config) => {
  if (config.chainId) {
    acc.push(`eip155:${config.chainId}`);
  }
  return acc;
}, [] as Array<`eip155:${string}`>);

class Storage implements IKeyValueStorage {
  constructor(private readonly sessionPath: string = WALLET_CONNECT_STORE_PATH) {}

  async #readData(): Promise<Record<string, any> | null> {
    if (!fs.existsSync(this.sessionPath)) return null;
    return JSON.parse(await fs.promises.readFile(this.sessionPath, 'utf-8'));
  }

  async #writeData(data: Record<string, any>): Promise<void> {
    return fs.promises.writeFile(this.sessionPath, JSON.stringify(data, null, 2));
  }

  async getKeys(): Promise<string[]> {
    const data = await this.#readData();
    if (!data) return [];
    return Object.keys(data);
  }

  async getEntries<T = any>(): Promise<[string, T][]> {
    const data = await this.#readData();
    if (!data) return [];
    return Object.entries(data) as [string, T][];
  }

  async getItem<T = any>(key: string): Promise<T | undefined> {
    const data = await this.#readData();
    return data?.[key] ?? undefined;
  }

  async setItem<T = any>(key: string, value: T): Promise<void> {
    const data = (await this.#readData()) ?? {};
    data[key] = value;
    await this.#writeData(data);
  }
  async removeItem(key: string): Promise<void> {
    const data = await this.#readData();
    if (!data) return;
    delete data[key];
    await this.#writeData(data);
  }
}

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
        url: 'https://subquery.network',
        icons: ['https://subquery.network/favicon.ico'],
      },
      // logger: 'debug',
      storage: new Storage(),
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
        this.signClient.core.relayer.transportClose();
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
        // console.log('\n=== WalletConnect URI ===');
        // console.log('Scan this QR code with your wallet app:');

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async signMessage(message: string): Promise<string> {
    throw new Error('signMessage is not allowed through the CLI');

    // return this.runRequest<string>('personal_sign', [hexlify(Buffer.from(message, 'utf8')), this.account]);
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

    const txHash = await this.runRequest<string>('eth_sendTransaction', [txParams]);

    // WARNING this is a workaround for WalletConnect and is not actually the full transaction.
    // The transaction is wrappped to provide the `.wait` method so we can wait for confirmation and get the receipt.
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
