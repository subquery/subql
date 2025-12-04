// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

async function runRequest<T>(chainId: string | number, params: Record<string, string>): Promise<T | undefined> {
  const url = `https://api.etherscan.io/v2/api?${new URLSearchParams({
    ...params,
    chainid: String(chainId),
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  }).toString()}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch from Etherscan API: ${res.statusText}`);
  }

  const data = (await res.json()) as {status: '0' | '1'; message: string; result: T};

  if (data.status === '0') {
    if (data.result === 'Missing/Invalid API Key') {
      throw new Error('Missing or invalid Etherscan API key. Please set ETHERSCAN_API_KEY environment variable.');
    }
    if (data.message === 'No data found') {
      return undefined;
    }
    throw new Error(`Etherscan API error: ${data.result}`);
  }

  return data.result;
}

/**
 * Fetches the ABI from Etherscan.
 * @param address - The contract address to fetch the ABI for.
 * @param chainId - The chain ID of the Ethereum network.
 * @returns The ABI as a JSON object or undefined if the fetch fails.
 */
export async function tryFetchAbiFromExplorer(address: string, chainId: number | string): Promise<unknown> {
  try {
    const result = await runRequest<string>(chainId, {
      module: 'contract',
      action: 'getabi',
      address,
    });

    if (!result) {
      return undefined;
    }

    return JSON.parse(result);
  } catch (e) {
    if (e instanceof Error && e.message.includes('Contract source code not verified')) {
      return undefined;
    }
    throw e;
  }
}

/**
 * Fetches the deployment height of a contract from Etherscan.
 * @param address - The contract address to fetch the deployment height for.
 * @param chainId - The chain ID of the Ethereum network.
 * @returns The block number where the contract was deployed, or undefined if not found.
 */
export async function fetchContractDeployHeight(
  address: string,
  chainId: number | string
): Promise<number | undefined> {
  const result = await runRequest<{blockNumber: string}[]>(chainId, {
    module: 'contract',
    action: 'getcontractcreation',
    contractaddresses: address,
  });

  if (!result) {
    return undefined;
  }

  return parseInt(result[0].blockNumber, 10);
}
