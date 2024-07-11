// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import axios from 'axios';
import FormData from 'form-data';
import {streamCat} from './utils';

type ContentData = string | Uint8Array;

type Content =
  | {
      content: ContentData;
      path: string;
    }
  | ContentData;

type AddOptions = {
  pin?: boolean;
  cidVersion?: number;
  wrapWithDirectory?: boolean;
};

type AddResult = {
  path: string;
  cid: string;
  size: number;
};

export class IPFSHTTPClientLite {
  constructor(private option: {url: string; headers?: Record<string, string>}) {
    if (option.url === undefined) {
      throw new Error('url is required');
    }
    this.option = option;
  }

  get url(): string {
    return this.option.url.toString();
  }

  /**
   * Returns content of the file addressed by a valid IPFS Path or CID
   */
  cat(ipfsCID: string): AsyncIterable<Uint8Array> {
    return streamCat(this.option.url, ipfsCID);
  }

  /**
   * Import a file or data into IPFS
   */
  async add(content: Content, options?: AddOptions): Promise<AddResult> {
    const results = await this.addAll([content], options);

    return results[0];
  }

  /**
   * Pin a content with a given CID to a remote pinning service.
   */
  async pinRemoteAdd(cid: string, options: {service: string}): Promise<{Cid: string; Name: string; Status: string}> {
    const url = new URL(`${this.url}/pin/remote/add`);
    url.searchParams.append('arg', cid);
    url.searchParams.append('service', options.service);
    try {
      const response = await axios.post(
        url.toString(),
        {},
        {
          headers: {
            ...this.option.headers,
          },
        }
      );
      return response.data;
    } catch (e) {
      throw new Error(`Failed to pin CID ${cid} to remote service`, {cause: e});
    }
  }

  /**
   * Import multiple files and data into IPFS
   */
  async addAll(source: Content[], options?: AddOptions): Promise<AddResult[]> {
    const formData = this.makeFormData(source);

    const url = new URL(`${this.url}/add`);
    if (options) {
      url.searchParams.append('pin', options.pin?.toString() ?? 'true');
      url.searchParams.append('cid-version', options.cidVersion?.toString() ?? '0');
      url.searchParams.append('wrap-with-directory', options.wrapWithDirectory?.toString() ?? 'false');
    }

    try {
      const response = await axios.post(url.toString(), formData, {
        headers: {
          ...this.option.headers,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const mapResponse = (raw: any): AddResult => ({
        path: raw.Name,
        cid: raw.Hash,
        size: parseInt(raw.Size, 10),
      });

      // If only one file is uploaded then the response is an object.
      if (typeof response.data === 'object') {
        return [mapResponse(response.data)];
      }

      const jsonLines = (response.data.split('\n') as string[]).filter((l) => l !== '');

      return jsonLines.map((line) => JSON.parse(line)).map(mapResponse);
    } catch (error) {
      throw new Error(`Failed to upload files to IPFS`, {cause: error});
    }
  }

  private makeFormData(contents: Content[]): FormData {
    const formData = new FormData();
    for (const content of contents) {
      if (content instanceof Uint8Array) {
        formData.append('data', Buffer.from(content));
      } else if (typeof content === 'string') {
        formData.append('data', content);
      } else {
        formData.append('data', content.content, {filename: content.path});
      }
    }

    return formData;
  }
}
