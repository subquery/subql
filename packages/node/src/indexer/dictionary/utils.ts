// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { SubqlDatasource } from '@subql/types-ethereum';
import { groupBy, partition } from 'lodash';
import {
  EthereumProjectDsTemplate,
  EthereumProjectDs,
} from '../../configure/SubqueryProject';

function isTemplateDs(
  ds: EthereumProjectDs | EthereumProjectDsTemplate,
): ds is EthereumProjectDsTemplate {
  return !!(ds as EthereumProjectDsTemplate)?.name;
}

export function ethFilterDs(
  dataSources: (EthereumProjectDs | EthereumProjectDsTemplate)[],
): SubqlDatasource[] {
  const [normalDataSources, templateDataSources] = partition(
    dataSources,
    (ds) => !isTemplateDs(ds),
  );

  // Group templ
  const groupedDataSources = Object.values(
    groupBy(
      templateDataSources as EthereumProjectDsTemplate[],
      (ds) => ds.name,
    ),
  ).map((grouped) => {
    if (grouped.length === 1) {
      return grouped[0];
    }

    const options = grouped.map((ds) => ds.options);
    const ref = grouped[0];

    return {
      ...ref,
      groupedOptions: options,
    };
  });

  return [...normalDataSources, ...groupedDataSources];
}
