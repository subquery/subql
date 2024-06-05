// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export function handledStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    if (error instanceof Error) {
      return error.stack || error.message;
    }
    return 'Unknown error when Stringify';
  }
}
