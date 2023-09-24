'use strict';
// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0
Object.defineProperty(exports, '__esModule', {value: true});
exports.testSandbox = void 0;
async function testSandbox() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('OK');
}
exports.testSandbox = testSandbox;
