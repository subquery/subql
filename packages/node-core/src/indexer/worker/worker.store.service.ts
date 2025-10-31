// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Store, FieldsExpression, GetOptions, Entity} from '@subql/types-core';
import {unwrapProxyArgs} from './utils';

export type HostStore = {
  // This matches the store interface
  storeGet: (entity: string, id: string) => Promise<any>;
  storeGetByField: <T extends Entity>(
    entity: string,
    field: keyof T,
    value: any,
    options: GetOptions<T>
  ) => Promise<T[]>;
  storeGetByFields: <T extends Entity>(
    entity: string,
    filter: FieldsExpression<T>[],
    options: GetOptions<T>
  ) => Promise<T[]>;
  storeGetOneByField: (entity: string, field: string, value: any) => Promise<any>;
  storeSet: (entity: string, id: string, data: any) => Promise<void>;
  storeBulkCreate: (entity: string, data: any[]) => Promise<void>;
  storeBulkUpdate: (entity: string, data: any[], fields?: string[]) => Promise<void>;
  storeRemove: (entity: string, id: string) => Promise<void>;
  storeBulkRemove: (entity: string, ids: string[]) => Promise<void>;
};

export const hostStoreKeys: (keyof HostStore)[] = [
  'storeGet',
  'storeGetByField',
  'storeGetByFields',
  'storeGetOneByField',
  'storeSet',
  'storeBulkCreate',
  'storeBulkUpdate',
  'storeRemove',
  'storeBulkRemove',
];

// Entities have to be converted to plain objects so they can be serialized.
// We don't need the functions to be included
export const hostStoreToStore = (host: HostStore): Store => {
  return {
    get: unwrapProxyArgs(host.storeGet),
    getByField: unwrapProxyArgs(host.storeGetByField),
    getByFields: unwrapProxyArgs(host.storeGetByFields),
    getOneByField: unwrapProxyArgs(host.storeGetOneByField),
    set: unwrapProxyArgs(host.storeSet),
    bulkCreate: unwrapProxyArgs(host.storeBulkCreate),
    bulkUpdate: unwrapProxyArgs(host.storeBulkUpdate),
    remove: unwrapProxyArgs(host.storeRemove),
    bulkRemove: unwrapProxyArgs(host.storeBulkRemove),
  };
};

export function storeHostFunctions(store: Store): HostStore {
  return {
    storeGet: store.get.bind(store),
    storeGetByField: store.getByField.bind<any>(store),
    storeGetByFields: store.getByFields.bind<any>(store),
    storeGetOneByField: store.getOneByField.bind(store),
    storeSet: store.set.bind(store),
    storeBulkCreate: store.bulkCreate.bind(store),
    storeBulkUpdate: store.bulkUpdate.bind(store),
    storeRemove: store.remove.bind(store),
    storeBulkRemove: store.bulkRemove.bind(store),
  };
}
