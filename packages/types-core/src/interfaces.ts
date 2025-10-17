// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
export type DynamicDatasourceDestructor = (name?: string, index?: number) => Promise<void>;

export interface DynamicDatasourceInfo {
  index: number;
  templateName: string;
  startBlock: number;
  endBlock?: number;
  args?: Record<string, unknown>;
}

export type DynamicDatasourceGetter = (templateName: string) => Promise<DynamicDatasourceInfo[]>;

export interface Cache<T extends Record<string, any> = Record<string, any>> {
  set(key: keyof T, value: T[keyof T]): Promise<void>;
  get(key: keyof T): Promise<T[keyof T] | undefined>;
}
