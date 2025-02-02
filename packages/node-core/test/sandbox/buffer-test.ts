// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export async function testSandbox(): Promise<void> {
  const str = 'Hello, Buffer!';
  const strBuffer = Buffer.from(str);
  const uin8Array = new Uint8Array(2);
  uin8Array[0] = 72; //'H'
  uin8Array[1] = 101; //'e'
  try {
    const output = Buffer.concat([strBuffer, uin8Array]);
    console.log(output.toString()); //expect to be `Hello, Buffer!He`
  } catch (e) {
    throw new Error(`Buffer concat failed, ${e}`);
  }
}

export async function testUin8Array(): Promise<void> {
  const uin8Array = new Uint8Array(2);
  const uin8Array2 = new Uint8Array(2);
  uin8Array[0] = 72; //'H'
  uin8Array[1] = 101; //'e'
  uin8Array2[0] = 72;
  uin8Array2[1] = 101;
  try {
    const output = Buffer.concat([uin8Array, uin8Array2]);
    console.log(output.toString()); //expect to be `HeHe`
  } catch (e) {
    throw new Error(`Uin8Array concat failed, ${e}`);
  }
}
