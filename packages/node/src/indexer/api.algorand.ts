// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import algosdk from 'algosdk';

export function AlgorandClient(
  token: string,
  server: string,
  port: number,
): algosdk.Algodv2 {
  return new algosdk.Algodv2(token, server, port);
}

export async function AlgorandLastHeader(
  client: algosdk.Algodv2,
): Promise<any> {
  const lastHeader = (
    await client.block((await client.status().do())['last-round']).do()
  ).block;
  return lastHeader;
}

export function AlgorandGenesisHash(lastHeader: any): string {
  return lastHeader.gh.toString('hex');
}

export function AlgorandRuntimeChain(lastHeader: any): string {
  return lastHeader.gen as string;
}

export async function AlgorandGetFinalizedBlockHeight(
  client: algosdk.Algodv2,
): Promise<number> {
  const finalizedBlockHeight: number = (await client.status().do())[
    'last-round'
  ];
  return finalizedBlockHeight;
}

export async function AlgorandGetLastHeight(
  client: algosdk.Algodv2,
): Promise<number> {
  const lastHeight = (await client.status().do())['last-round'];
  return lastHeight;
}
