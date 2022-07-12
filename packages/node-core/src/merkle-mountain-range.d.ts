// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

declare module '@subql/x-merkle-mountain-range' {
  class MMR<D extends Db = Db> {

    constructor(public digest: Digest, public db: D)
    getLeafLength(): Promise<number>;
    get(leafIndex: number): Promise<Uint8Array>;
    getRoot(leafIndex: number): Promise<Uint8Array>;
    append(value: Uint8Array, leafIndex?: number): Promise<void>;
    getProof(leafIndexes: number[], referenceTreeLength?: any): Promise<MMR<MemoryBasedDb>>;
  }

  type Digest = (...nodeValues: Uint8Array[]) => Uint8Array;

  interface Db {
    getLeafLength(): Promise<number>;
    setLeafLength(length: number): Promise<number>;
    getNodes(): Promise<Record<number, Uint8Array>>;
  }

  class FileBasedDb implements Db {
    static open(path: string): Promise<FileBasedDb>;
    static create(path: string, wordSize: number): Promise<FileBasedDb>;

    getLeafLength(): Promise<number>;
    setLeafLength(length: number): Promise<number>;
    getNodes(): Promise<Record<number, Uint8Array>>;
  }

  class MemoryBasedDb implements Db {
    getLeafLength(): Promise<number>;
    setLeafLength(length: number): Promise<number>;
    getNodes(): Promise<Record<number, Uint8Array>>;

    leafLength: number;
    nodes: Record<number, Uint8Array>;
  }
}
