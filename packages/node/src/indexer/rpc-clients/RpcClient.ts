// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { JsonRpcRequest, JsonRpcSuccessResponse } from '@cosmjs/json-rpc';

export interface RpcClient {
  readonly execute: (
    request: JsonRpcRequest,
  ) => Promise<JsonRpcSuccessResponse>;
  readonly disconnect: () => void;
}
