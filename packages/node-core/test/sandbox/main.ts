// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export async function testSandbox(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('OK');
}
