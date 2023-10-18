// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as util from 'util';
import {Store, FieldsExpression} from '@subql/types-core';
import {instanceToPlain} from 'class-transformer';

/**
 * Proxy objects aren't serializable between worker threads.
 * VM2 Seems to have objects come out as proxy objects.
 * NOTE do not use this on return types, if used on an entity it would strip all functions and have a plain object
 * */
function unwrapProxy<T = any>(input: T): T {
  if (!util.types.isProxy(input)) {
    return input;
  }

  return instanceToPlain(input) as T;
}

/* Unwraps any arguments to a function that are proxy objects */
export function unwrapProxyArgs<T extends Array<any>, R>(fn: (...args: T) => R): (...args: T) => R {
  return (...args: T) => fn(...(args.map(unwrapProxy) as T));
}

export type HostStore = {
  // This matches the store interface
  storeGet: (entity: string, id: string) => Promise<any | null>;
  storeGetByField: (
    entity: string,
    field: string,
    value: any,
    options?: {offset?: number; limit?: number}
  ) => Promise<any[]>;
  storeGetByFields: (
    entity: string,
    filter: FieldsExpression<any>[],
    options?: {offset?: number; limit?: number}
  ) => Promise<any[]>;
  storeGetOneByField: (entity: string, field: string, value: any) => Promise<any | null>;
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
// We don't need the funcitons to be included
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
    storeGetByField: store.getByField.bind(store),
    storeGetByFields: store.getByFields.bind(store),
    storeGetOneByField: store.getOneByField.bind(store),
    storeSet: store.set.bind(store),
    storeBulkCreate: store.bulkCreate.bind(store),
    storeBulkUpdate: store.bulkUpdate.bind(store),
    storeRemove: store.remove.bind(store),
    storeBulkRemove: store.bulkRemove.bind(store),
  };
}
