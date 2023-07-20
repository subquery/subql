// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Store} from '@subql/types';
import {classToPlain} from 'class-transformer';

export type HostStore = {
  // This matches the store interface
  storeGet: (entity: string, id: string) => Promise<any | null>;
  storeGetByField: (
    entity: string,
    field: string,
    value: any,
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
    get: host.storeGet,
    getByField: host.storeGetByField,
    getOneByField: host.storeGetOneByField,
    set: (entity, id, data) => host.storeSet(entity, id, classToPlain(data)),
    bulkCreate: (entity, data) => host.storeBulkCreate(entity, classToPlain(data) as any[]),
    bulkUpdate: (entity, data, fields) => host.storeBulkUpdate(entity, classToPlain(data) as any[], fields),
    remove: host.storeRemove,
    bulkRemove: host.storeBulkRemove,
  };
};
