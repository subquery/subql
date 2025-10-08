// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Store, Entity} from '@subql/types-core';

type Properties = {id: string};

export class EntityClass<P extends Properties> implements Entity {
  id: string;
  // Name needs to be private so that it can be converted to a generated entity
  #name: string;
  #store: Store;

  constructor(name: string, properties: P, store: Store) {
    this.#name = name;
    this.#store = store;
    this.id = properties.id;
    Object.assign(this, properties);
  }

  static create<T extends Entity>(name: string, properties: T | null | undefined, store: Store): T | undefined {
    if (!properties) return undefined;

    return new EntityClass<T>(name, properties, store) as unknown as T;
  }

  async save(): Promise<void> {
    return this.#store.set(this.#name, this.id, this);
  }
}
