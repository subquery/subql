// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FileReference, Processor} from '../types';

export interface BaseDataSource<H extends BaseHandler = BaseHandler, M extends BaseMapping<H> = BaseMapping<H>> {
  /**
   * The kind of the datasource.
   * @type {string}
   */
  kind: string;
  /**
   * The starting block number for the datasource. If not specified, 1 will be used (optional).
   * @type {number}
   * @default 1
   */
  startBlock?: number;
  /**
   * The ending block number for the datasource (optional).
   * @type {number}
   */
  endBlock?: number;
  /**
   * The mapping associated with the datasource.
   * This contains the handlers.
   * @type {M}
   */
  mapping: M;
}

export interface BaseCustomDataSource<H extends BaseHandler = BaseHandler, T extends BaseMapping<H> = BaseMapping<H>>
  extends BaseDataSource<H, T> {
  /**
   * The processor used for the custom datasource.
   * @type {Processor<O>}
   */
  processor: Processor;
  /**
   * A map of custom datasource assets. These typically include ABIs or other files used to decode data.
   * @type {Map<string, FileReference>}
   * @example
   * assets: new Map([['erc20', './abis/erc20.json']])
   */
  assets: Map<string, FileReference>;
}

export interface BaseMapping<T extends BaseHandler> extends FileReference {
  /**
   * An array of handlers associated with the mapping.
   * @type {T[]}
   */
  handlers: T[];
}

export interface BaseHandler<T = any, K extends string = string> {
  kind: K;
  /**
   * The name of your handler function. This must be defined and exported from your code.
   * @type {string}
   * @example
   * handler: 'handleBlock'
   */
  handler: string;
  /**
   * The filter for the handler. The handler kind will determine the possible filters (optional).
   */
  filter?: T;
}

export interface TemplateBase {
  /**
   * The name of the template. This must be unique.
   * */
  name: string;
}

export type BaseTemplateDataSource<DS extends BaseDataSource = BaseDataSource> = Omit<DS, 'startBlock' | 'endBlock'> &
  TemplateBase;
