// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
export type DynamicDatasourceDestructor = (name: string, index: number) => Promise<void>;

/**
 * Information about a dynamic datasource instance.
 */
export interface DynamicDatasourceInfo {
  /**
   * Global index of the datasource in the internal storage array.
   * Use this value when calling destroyDynamicDatasource().
   */
  index: number;
  /** Template name this datasource was created from */
  templateName: string;
  /** Block height where this datasource starts processing */
  startBlock: number;
  /** Block height where this datasource stops processing (if destroyed) */
  endBlock?: number;
  /** Arguments passed when creating this datasource */
  args?: Record<string, unknown>;
}

export type DynamicDatasourceGetter = (templateName: string) => DynamicDatasourceInfo[];

export interface Cache<T extends Record<string, any> = Record<string, any>> {
  set(key: keyof T, value: T[keyof T]): Promise<void>;
  get(key: keyof T): Promise<T[keyof T] | undefined>;
}
