// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* WARNING: Changes made to this file dont get applied with nodemon, yarn build needs to be run */

import assert from 'assert';
import { parentPort } from 'worker_threads';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import { Vec } from '@polkadot/types';
import { Codec } from '@polkadot/types-codec/types';
import { EventRecord, SignedBlock } from '@polkadot/types/interfaces';

export type Request<T extends 'init' | 'fetchBlock', A> = {
  id: number | string;
  type: T;
  args: A;
};

export type InitRequest = Request<'init', { endpoint: string }>;
export type FetchBlockRequest = Request<
  'fetchBlock',
  { height: number; specVersion?: number }
>;

export type Requests = InitRequest | FetchBlockRequest;

export type Response<A> = {
  id: number | string;
  args: A;
};

export type Encoded = {
  type: string;
  data: string | Uint8Array; // Hex string
};

export type FetchBlockArgs = {
  block: Encoded;
  events: Encoded;
  specVersion: number;
  blockHash: string;
};

let api: ApiPromise;

// eslint-disable-next-line @typescript-eslint/no-misused-promises
parentPort.on('message', async (r: Requests) => {
  switch (r.type) {
    case 'init': {
      await initApi(r.args.endpoint);

      // Send response
      parentPort.postMessage(<Response<void>>{
        id: r.id,
      });
      break;
    }
    case 'fetchBlock': {
      assert(api, 'Api not initialised');
      const [block, events, specVersion] = await fetchBlock(
        r.args.height,
        r.args.specVersion,
      );

      // Send response
      parentPort.postMessage(<Response<FetchBlockArgs>>{
        id: r.id,
        args: {
          block: toEncoded(block),
          events: toEncoded(events),
          specVersion,
          blockHash: block.block.hash.toHex(),
        },
      });

      break;
    }
    default: {
      console.error('Unknown message received', r);
      break;
    }
  }
});

async function initApi(endpoint: string): Promise<void> {
  let provider: WsProvider | HttpProvider;
  let throwOnConnect = false;
  if (endpoint.startsWith('ws')) {
    provider = new WsProvider(endpoint);
  } else if (endpoint.startsWith('http')) {
    provider = new HttpProvider(endpoint);
    throwOnConnect = true;
  }

  api = await ApiPromise.create({
    provider,
    throwOnConnect,
  });
}

async function fetchBlock(
  height: number,
  specVersion?: number,
): Promise<[SignedBlock, Vec<EventRecord>, number]> {
  const hash = await api.rpc.chain.getBlockHash(height);

  // TODO spec versions?

  return Promise.all([
    api.rpc.chain.getBlock(hash),
    api.query.system.events.at(hash),
    specVersion ??
      api.rpc.state
        .getRuntimeVersion(hash)
        .then((res) => res.specVersion.toNumber()),
  ]);
}

function toEncoded(input: Codec): Encoded {
  return { type: input.toRawType(), data: input.toU8a() };
}
