// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FileReference} from '../types';

export interface BaseDataSource<
  F = any,
  H extends BaseHandler<F> = BaseHandler<F>,
  T extends BaseMapping<F, H> = BaseMapping<F, H>
> {
  kind: string;
  startBlock?: number;
  mapping: T;
}

export interface BaseCustomDataSource<
  F = any,
  H extends BaseHandler<F> = BaseHandler<F>,
  T extends BaseMapping<F, H> = BaseMapping<F, H>
> extends BaseDataSource<F, H, T> {
  processor: FileReference;
  assets: Map<string, FileReference>;
}

export interface BaseMapping<F, T extends BaseHandler<F>> {
  file: string;
  handlers: T[];
}

export interface BaseHandler<T> {
  handler: string;
  kind: string;
  filter?: T;
}

export interface TemplateBase {
  /**
   * The name of the template. This must be unique.
   * */
  name: string;
}

export type BaseTemplateDataSource<DS extends BaseDataSource = BaseDataSource> = Omit<DS, 'startBlock'> & TemplateBase;
