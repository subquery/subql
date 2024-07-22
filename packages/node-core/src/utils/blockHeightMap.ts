// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

type GetRange<T> = {value: T; startHeight: number; endHeight?: number};

export class EntryNotFoundError extends Error {
  constructor(height: number) {
    super(`Entry not found at height ${height}`);
  }
}

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
    const details = this.getDetails(height);

    if (details === undefined) {
      throw new EntryNotFoundError(height);
    }

    return details.value;
  }

  // Same as get but wont throw when there is nothing in the block range
  getSafe(height: number): T | undefined {
    try {
      return this.get(height);
    } catch (e) {
      return undefined;
    }
  }

  getDetails(height: number): GetRange<T> | undefined {
    let result: GetRange<T> | undefined;

    const arr = [...this.#map.entries()];

    for (let i = 0; i < arr.length; i++) {
      const [currentHeight, value] = arr[i];
      const nextStart = arr[i + 1]?.[0];
      const r = {
        value,
        startHeight: currentHeight,
        endHeight: nextStart ? nextStart - 1 : undefined,
      };

      if (currentHeight === height) {
        result = r;
        break;
      }
      if (currentHeight <= height) {
        result = r;
      }

      if (currentHeight > height) {
        break;
      }
    }

    return result;
  }

  getAllWithRange(): GetRange<T>[] {
    return [...this.#map.entries()].map(([key, value], index, entries) => {
      return {
        value,
        startHeight: key,
        endHeight: entries[index + 1]?.[0] - 1, // Start height of the nex item
      };
    });
  }

  getWithinRange(startHeight: number, endHeight: number): Map<number, T> {
    const result = new Map<number, T>();
    let previousKey: number | null = null;

    for (const [key, value] of this.#map) {
      if (previousKey !== null && previousKey < startHeight && key >= startHeight) {
        const previousValue = this.#map.get(previousKey);
        if (previousValue !== undefined) {
          result.set(previousKey, previousValue);
        }
      }

      if (key >= startHeight && key <= endHeight) {
        result.set(key, value);
      }

      previousKey = key;
    }

    return result;
  }

  map<T2>(fn: (value: T) => T2): BlockHeightMap<T2> {
    const newMap = new Map<number, T2>();

    for (const [key, value] of this.#map) {
      newMap.set(key, fn(value));
    }

    return new BlockHeightMap(newMap);
  }
}
