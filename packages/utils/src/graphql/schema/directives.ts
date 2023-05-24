// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import gql from 'graphql-tag';

export const directives = gql`
  directive @derivedFrom(field: String!) on FIELD_DEFINITION
  directive @entity on OBJECT
  directive @jsonField(indexed: Boolean) on OBJECT
  directive @index(unique: Boolean) on FIELD_DEFINITION
  directive @joinIndex(fields: [String]!) on FIELD_DEFINITION
`;
