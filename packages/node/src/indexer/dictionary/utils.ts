// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { SubstrateCustomDatasource, SubstrateDatasource } from '@subql/types';
import { groupBy, partition } from 'lodash';

export function ethFilterDs(
  dataSources: SubstrateDsInterface[],
): SubstrateDsInterface[] {
  const [normalDataSources, templateDataSources] = partition(
    dataSources,
    (ds) => !ds.name,
  );

  // Group templ
  const groupedDataSources = Object.values(
    groupBy(templateDataSources, (ds) => ds.name),
  ).map((grouped) => {
    if (grouped.length === 1) {
      return grouped[0];
    }

    const options = grouped.map((ds) => ds.processor.options);
    const ref = grouped[0];

    return {
      ...ref,
      groupedOptions: options,
    };
  });

  const filteredDs = [...normalDataSources, ...groupedDataSources];
  return filteredDs;
}

export type SubstrateDsInterface = SubstrateCustomDatasource & {
  name?: string;
};
