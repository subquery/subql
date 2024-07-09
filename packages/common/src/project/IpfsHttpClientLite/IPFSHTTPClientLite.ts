// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {addAll} from '@subql/common/project/IpfsHttpClientLite/addAll';
import axios from 'axios';
import FormData from 'form-data';
import type {Pin} from 'ipfs-core-types/types/src/pin/remote/index';
import type {AddOptions, AddResult} from 'ipfs-core-types/types/src/root';
import type {AbortOptions, ImportCandidate} from 'ipfs-core-types/types/src/utils';
import type {HTTPClientExtraOptions} from 'ipfs-http-client/types/src/types';
import {CID} from 'multiformats/cid';
import {LiteAddAllOptions, IPFSOptions} from './interfaces';
import {asyncIterableFromStream, decodePin} from './utils';

export class IPFSHTTPClientLite {
  private option: IPFSOptions;

  constructor(option: IPFSOptions) {
    this.option = option;
  }

  get url(): string {
    if (this.option.url === undefined) {
      throw new Error('url is required');
    }
    return this.option.url.toString();
  }

  /**
   * Returns content of the file addressed by a valid IPFS Path or CID
   */
  cat(ipfsCID: string): AsyncIterable<Uint8Array> {
    const url = `${this.option.url}/cat?arg=${ipfsCID}`;

    try {
      const response = axios.post(url, {
        responseType: 'stream',
      });
      return asyncIterableFromStream(response);
    } catch (error) {
      throw new Error(`Failed to fetch data from IPFS for CID ${ipfsCID}`);
    }
  }

  /**
   * Import a file or data into IPFS
   */
  async add(content: ImportCandidate, options?: AddOptions): Promise<AddResult> {
    const addUrl = `${this.url}/add`;
    const data = new FormData();
    if (content instanceof Uint8Array) {
      content = Buffer.from(content);
    }
    data.append('data', content);
    const response = await axios.post(addUrl, data, {
      headers: {
        ...data.getHeaders(),
        ...this.option.headers,
      },
      params: options,
    });

    const {Hash, Path, Size} = response.data;
    return {cid: CID.parse(Hash), size: Size, path: Path};
  }

  /**
   * Pin a content with a given CID to a remote pinning service.
   */
  async pinRemoteAdd(cid: CID, options: {service: string}): Promise<Pin> {
    const addUrl = `${this.url}/pin/remote/add`;
    // For our own use, we only limited to these args
    const urlWithParams = `${addUrl}?arg=${cid}&service=${options.service}`;
    try {
      const response = await axios.post(
        urlWithParams,
        {},
        {
          headers: {
            ...this.option.headers,
          },
        }
      );
      return decodePin(response.data);
    } catch (e) {
      throw new Error(`Failed to pin CID ${cid} to remote service`, {cause: e});
    }
  }

  /**
   * Import multiple files and data into IPFS
   */

  addAll(
    source: ImportCandidate[],
    options?: LiteAddAllOptions & AbortOptions & HTTPClientExtraOptions
  ): AsyncIterable<AddResult> {
    const addUrl = `${this.url}/add`;
    return addAll(addUrl, source, {...options, headers: this.option.headers});
  }
}
