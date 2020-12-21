// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface Entity {
  id: string;
}

export interface Store {
  get(entity: string, id: string): Promise<Entity | null>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
}
