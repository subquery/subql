// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AsyncLocalStorage} from 'async_hooks';

// Stores the current blockHeight (or timestamp) for the active request.
// Set by PgBlockHeightPlugin when blockHeight/timestamp arg is provided,
// read by relation field plan wrappers for automatic inheritance.
//
// NOTE: enterWith mutates the store for the rest of the current async context.
// Sibling fields processed after a field's applyPlan may see the mutated value.
// For most queries this is fine — the parent's blockHeight propagates correctly
// to depth-first child fields. For sibling isolation (e.g., child with
// blockHeight:4 vs childGrandchildren on same parent), use step-based lookup
// via blockHeightStepMap instead.
export const currentBlockHeight = new AsyncLocalStorage<string | undefined>();
