// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import axios from 'axios';
import FormData from 'form-data';
import type {AddResult} from 'ipfs-core-types/types/src/root';
import type {AbortOptions, ImportCandidate} from 'ipfs-core-types/types/src/utils';
import type {HTTPClientExtraOptions} from 'ipfs-http-client/types/src/types';
import {LiteAddAllOptions} from './interfaces';

export async function* addAll(
  addUrl: string,
  source: ImportCandidate[],
  options: LiteAddAllOptions & AbortOptions & HTTPClientExtraOptions
): AsyncIterable<AddResult> {
  const formData = new FormData();

  for (const item of source) {
    // TODO, if source is file type, we need only append content
    formData.append('data', JSON.stringify(item));
  }

  try {
    const response = await axios.post(addUrl, formData, {
      headers: {
        ...options.headers,
        ...formData.getHeaders(),
      },
      onUploadProgress: options.progress,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const jsonLines = (response.data.split('\n') as string[]).filter((l) => l !== '');

    for (const line of jsonLines) {
      const result = JSON.parse(line);
      yield {
        path: result.Name,
        cid: result.Hash,
        size: parseInt(result.Size, 10),
      };
    }
  } catch (error) {
    throw new Error(`Failed to upload files to IPFS`, {cause: error});
  }
}
