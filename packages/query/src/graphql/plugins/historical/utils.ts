// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Returns true if the given codec (or entity with codec) has a _block_range attribute
export function hasBlockRange(entity: any): boolean {
  if (!entity) return true;
  const codec = entity.attributes ? entity : entity.codec;
  if (!codec?.attributes) return true;
  return '_block_range' in (codec?.attributes ?? {});
}
