// SPDX-License-Identifier: GPL-3.0

export async function testSandbox(): Promise<void> {
  try {
    const base64String = 'SGVsbG8sIFdvcmxkIQ==';
    console.log(atob(base64String)); //expect to be `Hello, World!`
  } catch (e) {
    throw new Error(`atob in sandbox failed, ${e}`);
  }
}
