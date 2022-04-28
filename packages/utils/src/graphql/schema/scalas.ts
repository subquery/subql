// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import gql from 'graphql-tag';

export const scalas = gql`
  scalar BigInt
  scalar BigDecimal
  scalar Date
  scalar Bytes
  scalar Float
`;
