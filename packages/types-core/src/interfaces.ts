// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;

export interface Cache {
  set<D>(key: string, value: D): Promise<void>;
  get<D>(key: string): Promise<D | undefined>;
}
