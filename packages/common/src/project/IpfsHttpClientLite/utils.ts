// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AxiosResponse} from 'axios';

export async function* asyncIterableFromStream(response: Promise<AxiosResponse>): AsyncIterable<Uint8Array> {
  const stream = (await response).data;
  for await (const chunk of stream) {
    yield new Uint8Array(Buffer.from(chunk));
  }
}
