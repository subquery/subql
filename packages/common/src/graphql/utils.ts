// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {FieldScalar} from './types';

export function isFieldScalar(type: any): type is FieldScalar {
  return Object.values(FieldScalar).includes(type);
}
