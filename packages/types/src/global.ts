// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Provider} from '@ethersproject/abstract-provider';

declare global {
  const api: Provider;
  const unsafeApi: Provider | undefined;
}
