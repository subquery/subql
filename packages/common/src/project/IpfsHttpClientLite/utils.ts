// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AxiosResponse} from 'axios';
import type {Pin, Status} from 'ipfs-core-types/types/src/pin/remote/index';
import {CID} from 'multiformats/cid';

export async function* asyncIterableFromStream(response: Promise<AxiosResponse>): AsyncIterable<Uint8Array> {
  const stream = (await response).data;
  for await (const chunk of stream) {
    yield new Uint8Array(Buffer.from(chunk));
  }
}

export const decodePin = ({Cid: cid, Name: name, Status: status}: {Cid: string; Name: string; Status: Status}): Pin => {
  return {
    cid: CID.parse(cid),
    name,
    status,
  };
};
