// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FieldOperators, GetOptions} from '@subql/types-core';
import {Op} from '@subql/x-sequelize';

export const operatorsMap: Record<FieldOperators, any> = {
  '=': Op.eq,
  '!=': Op.ne,
  in: Op.in,
  '!in': Op.notIn,
};

const defaultOptions: Required<GetOptions<{id: string}>> = {
  offset: 0,
  limit: 100,
  orderBy: 'id',
  orderDirection: 'ASC',
};

// Ensure we have all the options
export const getFullOptions = <T>(options?: GetOptions<T>): Required<GetOptions<T>> =>
  ({
    ...(defaultOptions as GetOptions<T>),
    ...options,
  }) as Required<GetOptions<T>>;
