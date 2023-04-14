// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {GraphQLSchema} from 'graphql';

export abstract class SubqueryProject {
  id: string;
  root: string;
  dataSources: any[];
  schema: GraphQLSchema;
}
