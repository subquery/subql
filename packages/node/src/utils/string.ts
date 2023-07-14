// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export function stringNormalizedEq(a: string, b: string): boolean {
  return a.toLowerCase() === b?.toLowerCase();
}
