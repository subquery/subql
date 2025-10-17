// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SQNetworks} from '@subql/network-config';
import {IKeyValueStorage} from '@walletconnect/keyvaluestorage';
import {Signer, utils} from 'ethers';
import {SiweMessage, generateNonce} from 'siwe';
import {Logger} from '../../../adapters/utils';
import {CONSUMER_HOST_STORE_PATH} from '../../../constants';
import {WALLET_DOMAIN} from '../constants';
import {JSONFileStorage} from '../json-file-store';
import {NetworkConsumerHostServiceApi, RequestParams} from './consumer-host-service-api';
import {
  ApiKey,
  convertApiKey,
  convertHostingPlan,
  convertHostingPlanExtra,
  HostingPlan,
  HostingPlanExtra,
} from './schemas';

const endpoints = {
  [SQNetworks.MAINNET]: 'https://chs.subquery.network',
  [SQNetworks.TESTNET]: 'https://chs.thechaindata.com',
  [SQNetworks.LOCAL]: 'http://localhost:8010', // Assuming local development
};

export class ConsumerHostClient {
  #network: SQNetworks;
  #api: NetworkConsumerHostServiceApi<unknown>;
  #tokenStore: IKeyValueStorage;
  #authToken?: string;

  /**
   * Creates and authenticates a new ConsumerHostClient instance.
   */
  static async create(
    network: SQNetworks,
    signer: Signer,
    logger: Logger,
    tokenStore = new JSONFileStorage(CONSUMER_HOST_STORE_PATH)
  ): Promise<ConsumerHostClient> {
    const endpoint = endpoints[network];
    if (!endpoints) {
      throw new Error(`Unsupported network: ${network}. Supported networks are: ${Object.keys(endpoints).join(', ')}`);
    }
    const client = new ConsumerHostClient(network, endpoint, tokenStore);

    await client.requestLoginToken(signer, logger);

    return client;
  }

  constructor(network: SQNetworks, endpoint: string, tokenStore: IKeyValueStorage) {
    this.#network = network;
    this.#api = new NetworkConsumerHostServiceApi({
      baseUrl: endpoint,
    });
    this.#tokenStore = tokenStore;
  }

  async requestLoginToken(signer: Signer, logger?: Logger): Promise<void> {
    if (this.#authToken) return;
    const address = await signer.getAddress();
    const storeKey = `${this.#network}:${address}`;
    const existingToken = await this.#tokenStore.getItem(storeKey);
    if (existingToken) {
      // This needs to be set in order for the API calls to work
      this.#authToken = existingToken;
      const workingKey = await this.getAPIKeys().then(
        () => true,
        () => false
      );
      if (workingKey) {
        return;
      }
      // Existing token doesn't work, request a new one
      await this.#tokenStore.removeItem(storeKey);
      this.#authToken = undefined;
    }

    const chainId = await signer.getChainId();
    const newMsg = new SiweMessage({
      domain: WALLET_DOMAIN, //'subquery.network', // Hard coded domains on the service, this gives an alert in metamask as the domain is not the same as in Wallet Connect
      address: utils.getAddress(address),
      statement: `Login to SubQuery Network`, // TODO can this be changed?
      uri: 'https://subquery.network',
      version: '1',
      chainId,
      nonce: generateNonce(),
    });

    const msg = newMsg.prepareMessage();

    logger?.info(`Please sign a message in your wallet to continue.`);
    const signature = await signer.signMessage(msg);

    const res = await this.#api.login.authControllerUserToken(
      {
        message: msg,
        signature,
      },
      {format: 'json'}
    );

    if (!res.ok) {
      console.error(`Login failed: ${res.statusText}, ${res.text}`);
      throw new Error(`Failed to login: ${res.error}`);
    }

    this.#isError(res.data);

    const {token} = res.data;

    if (!token) {
      throw new Error('Unable to get token');
    }

    this.#authToken = token;
    await this.#tokenStore.setItem(storeKey, token);
  }

  async createPlan(deploymentId: string, price: bigint): Promise<HostingPlan> {
    const res = await this.#api.users.hostingPlanControllerCreate(
      {
        deploymentId: deploymentId,
        price: price.toString(),
        // expiration: 3600 * 24 * 14, // 14 days in seconds, this has been picked from a default value in the front end
        // maximum: 2, // Unused according to the front end
      },
      this.#getRequestParams()
    );

    this.#isError(res.data);

    return convertHostingPlan(res.data);
  }

  async updatePlan(planId: number, price: string, expiration: number): Promise<HostingPlan> {
    const res = await this.#api.users.hostingPlanControllerEdit(planId, {price, expiration}, this.#getRequestParams());

    this.#isError(res.data);

    return convertHostingPlan(res.data);
  }

  async listPlans(): Promise<HostingPlanExtra[]> {
    const res = await this.#api.users.hostingPlanControllerIndex(this.#getRequestParams());

    this.#isError(res.data);

    return res.data.map((p) => convertHostingPlanExtra(p));
  }

  async getAPIKeys(): Promise<ApiKey[]> {
    const res = await this.#api.users.userControllerApikeyIndex(this.#getRequestParams());
    this.#isError(res.data);

    return res.data.map((key) => convertApiKey(key));
  }

  async newAPIKey(name: string): Promise<ApiKey> {
    const res = await this.#api.users.userControllerApikeyCreate({name}, this.#getRequestParams());

    this.#isError(res.data);

    return convertApiKey(res.data);
  }

  async deleteAPIKey(id: number): Promise<void> {
    const res = await this.#api.users.userControllerApikeyRemove(id, this.#getRequestParams());

    this.#isError(res.data);
  }

  #getRequestParams(): RequestParams {
    if (!this.#authToken) {
      throw new Error('Authentication token is not set. Please call requestLoginToken first.');
    }
    return {
      format: 'json',
      headers: {
        Authorization: `Bearer ${this.#authToken}`,
      },
    };
  }

  // The RPC behaves very strangely, it always returns 200 but the body can be an error.
  #isError<T>(data: any): asserts data is T {
    if (data.code && data.error) {
      const error = new Error(data.error);
      (error as any).code = data.code;
      throw error;
    }
  }
}
