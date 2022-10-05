// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { JsonRpcRequest, JsonRpcSuccessResponse } from '@cosmjs/json-rpc';

export interface RpcClient {
  readonly execute: (
    request: JsonRpcRequest,
  ) => Promise<JsonRpcSuccessResponse>;
  readonly disconnect: () => void;
}
