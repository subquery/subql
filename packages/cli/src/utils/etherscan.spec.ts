// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {fetchContractDeployHeight, tryFetchAbiFromExplorer} from './etherscan';

describe('etherscan api', () => {
  describe('ABI fetching', () => {
    it('can fetch the ABI', async () => {
      const abi = await tryFetchAbiFromExplorer('0x53A270147832Fc4eb962584911F5D55e86b1BA3F', '8453' /* Base */);
      expect(abi).toMatchSnapshot();
    });

    it('returns undefined if an ABI has not been uploaded', async () => {
      const abi = await tryFetchAbiFromExplorer('0x4eE879f39Cce3C4CA80E2ee90F9Df5aFEEaeb220', '1' /* Ethereum */);
      expect(abi).toBeUndefined();
    });

    it('throws if a contract is non-existant', async () => {
      const abi = await tryFetchAbiFromExplorer('0x53A270147832Fc4eb962584911F5D55e86b1BA3F', '1' /* Ethereum */);
      expect(abi).toBeUndefined();
    });

    it('throws for a network that is not supported', async () => {
      await expect(
        tryFetchAbiFromExplorer('0x53A270147832Fc4eb962584911F5D55e86b1BA3F', '1329' /* Moonbeam */)
      ).rejects.toThrow(
        'Etherscan API error: Missing or unsupported chainid parameter (required for v2 api), please see https://api.etherscan.io/v2/chainlist for the list of supported chainids'
      );
    });
  });

  describe('Deployment information', () => {
    it('can get the deploy height of a contract', async () => {
      const height = await fetchContractDeployHeight('0x53A270147832Fc4eb962584911F5D55e86b1BA3F', '8453' /* Base */);

      expect(height).toBe(22771721);
    });

    it('returns undefined when getting the deploy height for a non-existant contract', async () => {
      const height = await fetchContractDeployHeight('0x53A270147832Fc4eb962584911F5D55e86b1BA3F', '1' /* Ethereum */);
      expect(height).toBeUndefined();
    });
  });
});
