// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.testSandbox = void 0;
async function testSandbox() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('OK');
}
exports.testSandbox = testSandbox;
