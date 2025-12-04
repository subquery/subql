// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import contractErrorCodes from '@subql/contract-sdk/publish/revertcode.json';

export type ContractErrorCode = keyof typeof contractErrorCodes;

function mapContractError(rawErrorMsg: any): {revertCode?: ContractErrorCode; message?: string} {
  const revertCode = Object.keys(contractErrorCodes).find(
    (key) => rawErrorMsg.toString().match(`reverted: ${key}`) || (rawErrorMsg as any).reason === key
  ) as ContractErrorCode;
  return {
    revertCode,
    message: revertCode ? contractErrorCodes[revertCode] : undefined,
  };
}

/**
 * Parse a raw error from a contract call and throw a more descriptive error message if available.
 * You can provide an optional mapping of ContractErrorCode to custom error messages.
 */
export function parseContractError(
  overwriteError: Partial<Record<ContractErrorCode, () => Promise<string> | string>>
): (rawError: any) => Promise<never> {
  return async (rawError: any) => {
    const cErr = mapContractError(rawError);
    const getOverwriteMessage = overwriteError[cErr.revertCode as ContractErrorCode];
    if (getOverwriteMessage) {
      let message = cErr.message;
      try {
        message = await getOverwriteMessage();
      } catch (e) {
        // Do nothing
      }

      throw new Error(message, {cause: rawError});
    }
    if (cErr.message) {
      throw new Error(cErr.message, {cause: rawError});
    }
    throw rawError;
  };
}
