// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios, {AxiosInstance} from 'axios';
import {Response, ResponseError, ResponseSuccess, ResponseSuccessType} from './types';

const TIMEOUT = 5000;

let id = 0;
export class HttpJsonRpcClient {
  protected axios: AxiosInstance;
  constructor(url: string) {
    this.axios = axios.create({
      baseURL: url,
      timeout: TIMEOUT,
    });
  }

  async send<T extends ResponseSuccessType>(method: string, params?: any[]): Promise<T> {
    const res = await this.axios.post<Response<T>>('', {
      jsonrpc: '2.0',
      id: id++,
      method,
      params,
    });
    if ((res.data as ResponseError).error) {
      throw (res.data as ResponseError).error;
    }
    return (res.data as ResponseSuccess<T>).result;
  }
}
