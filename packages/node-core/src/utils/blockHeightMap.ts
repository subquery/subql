// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export class BlockHeightMap<T> {
  #map: Map<number, T>;

  constructor(initialValues: Map<number, T>) {
    // Ensure the values are sorted by key
    this.#map = new Map([...initialValues.entries()].sort((a, b) => a[0] - b[0]));
  }

  getAll(): Map<number, T> {
    return this.#map;
  }

  get(height: number): T {
    let result: T | undefined;

    for (const [currentHeight, value] of this.#map) {
      if (currentHeight === height) {
        result = value;
        break;
      }
      if (currentHeight <= height) {
        result = value;
      }

      if (currentHeight > height) {
        break;
      }
    }

    if (result === undefined) {
      throw new Error(`Value at height ${height} was undefined`);
    }

    return result;
  }

  // Same as get but wont throw when there is nothing in the block range
  getSafe(height: number): T | undefined {
    try {
      return this.get(height);
    } catch (e) {
      return undefined;
    }
  }

  getAllWithRange(): {value: T; startHeight: number; endHeight?: number}[] {
    return [...this.#map.entries()].map(([key, value], index, entries) => {
      return {
        value,
        startHeight: key,
        endHeight: entries[index + 1]?.[0], // Start height of the nex item
      };
    });
  }

  map<T2>(fn: (value: T) => T2): BlockHeightMap<T2> {
    const newMap = new Map<number, T2>();

    for (const [key, value] of this.#map) {
      newMap.set(key, fn(value));
    }

    return new BlockHeightMap(newMap);
  }
}
