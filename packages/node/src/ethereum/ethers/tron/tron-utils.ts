// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Tron chain IDs: Mainnet, Shasta testnet, Nile testnet
export const TRON_CHAIN_IDS = [728126428, 2494104990, 3448148188];

// Methods that accept transaction objects as parameters
export const TRON_TRANSACTION_METHODS = ['eth_call'];

/**
 * Remove type and accessList from transaction objects in params for Tron chains
 */
export function cleanParamsForTron(
  params: Array<any>,
  chainId: number,
): Array<any> {
  if (!TRON_CHAIN_IDS.includes(chainId)) {
    return params;
  }

  return params.map((param) => {
    if (param && typeof param === 'object' && !Array.isArray(param)) {
      const cleaned = { ...param };
      delete cleaned.type;
      delete cleaned.accessList;
      return cleaned;
    }
    return param;
  });
}

/**
 * Apply all Tron-specific parameter transformations for the given method.
 */
export function applyTronParamTransforms(
  method: string,
  params: Array<any>,
  chainId: number,
): Array<any> {
  if (TRON_TRANSACTION_METHODS.includes(method)) {
    return cleanParamsForTron(params, chainId);
  }
  return params;
}
