// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import axios from 'axios';

export async function* streamCat(baseUrl: string, ipfsCID: string): AsyncIterable<Uint8Array> {
  const url = new URL(`${baseUrl}/cat?progress=true`);
  url.searchParams.append('arg', ipfsCID);

  try {
    const res = await axios.post(
      url.toString(),
      {},
      {
        responseType: 'stream',
      }
    );
    // Iterate over the stream and yield data
    for await (const chunk of res.data) {
      yield chunk;
    }
  } catch (error) {
    throw new Error(`Failed to fetch data from IPFS for CID ${ipfsCID}`);
  }
}
