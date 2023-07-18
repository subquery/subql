// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import gql from 'graphql-tag';

export const scalas = gql`
  scalar BigInt
  scalar BigDecimal
  scalar Date
  scalar Bytes
  scalar Float
`;
