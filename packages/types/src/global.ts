// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Provider} from '@ethersproject/abstract-provider';
import '@subql/types-core/dist/global';

declare global {
  const api: Provider;
  const unsafeApi: Provider | undefined;
}
