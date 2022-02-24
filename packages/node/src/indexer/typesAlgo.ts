// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import algosdk from 'algosdk';

export type AlgorandBlock = Record<string, any>;

export interface AlgorandApi {
  client: algosdk.Algodv2;
  lastHeader: any; // Record<string, Buffer | number | string>;
}

export interface AlgorandOptions {
  token: string;
  server: string;
  port: number;
}
