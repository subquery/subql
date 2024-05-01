'use strict';
// SPDX-License-Identifier: GPL-3.0
Object.defineProperty(exports, '__esModule', {value: true});
exports.testSandbox = void 0;
async function testSandbox() {
  try {
    const base64String = 'SGVsbG8sIFdvcmxkIQ==';
    console.log(atob(base64String)); //expect to be `Hello, World!`
  } catch (e) {
    throw new Error(`atob in sandbox failed, ${e}`);
  }
}
exports.testSandbox = testSandbox;
//# sourceMappingURL=atob-test.js.map
