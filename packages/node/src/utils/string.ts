// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export function stringNormalizedEq(a: string, b: string): boolean {
  return a.toLowerCase() === b?.toLowerCase();
}
