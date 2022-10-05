// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import http from 'http';
import https from 'https';
import {
  isJsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  parseJsonRpcResponse,
} from '@cosmjs/json-rpc';
import { HttpEndpoint } from '@cosmjs/tendermint-rpc';
import axios, { AxiosInstance } from 'axios';
import { RpcClient } from './RpcClient';

export function hasProtocol(url: string): boolean {
  return url.search('://') !== -1;
}

export async function httpRequest(
  connection: AxiosInstance,
  request?: any,
): Promise<any> {
  const { data } = await connection.post('/', request);

  return data;
}

export class HttpClient implements RpcClient {
  protected readonly url: string;
  protected readonly headers: Record<string, string> | undefined;
  connection: AxiosInstance;

  constructor(endpoint: string | HttpEndpoint) {
    if (typeof endpoint === 'string') {
      // accept host.name:port and assume http protocol
      this.url = hasProtocol(endpoint) ? endpoint : `http://${endpoint}`;
    } else {
      this.url = endpoint.url;
      this.headers = endpoint.headers;
    }

    const { searchParams } = new URL(this.url);

    // Support OnFinality api keys
    if (searchParams.get('apikey')) {
      this.headers.apikey = searchParams.get('apikey');
      this.url = this.url.slice(0, this.url.indexOf('?apikey'));
    }

    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

    this.connection = axios.create({
      httpAgent,
      httpsAgent,
      baseURL: this.url,
      headers: this.headers,
    });
  }

  disconnect(): void {
    // nothing to be done
  }

  async execute(request: JsonRpcRequest): Promise<JsonRpcSuccessResponse> {
    const response = parseJsonRpcResponse(
      await httpRequest(this.connection, request),
    );
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(JSON.stringify(response.error));
    }
    return response;
  }
}
