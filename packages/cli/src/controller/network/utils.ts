// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {formatEther} from '@ethersproject/units';
import {ContractSDK} from '@subql/contract-sdk';
import {BigNumber, Signer} from 'ethers';
import {Logger, Prompt} from '../../adapters/utils';
import {checkTransactionSuccess} from './constants';

export async function checkAndIncreaseAllowance(
  signer: Signer,
  sdk: ContractSDK,
  amount: BigNumber,
  spender: string,
  logger: Logger,
  operationName: string,
  prompt?: Prompt
): Promise<void> {
  const userAddress = await signer.getAddress();

  // Check current allowance
  const allowance = await sdk.sqToken.allowance(userAddress, spender);
  logger.info(`Current allowance: ${formatEther(allowance)} SQT`);
  logger.info(`Amount needed: ${formatEther(amount)} SQT`);

  if (allowance.lt(amount)) {
    const needed = amount.sub(allowance);
    logger.warn(`Insufficient allowance. Need to approve ${formatEther(needed)} SQT additional allowance.`);

    if (prompt) {
      const confirm = await prompt({
        type: 'boolean',
        message: `Approve additional ${formatEther(needed)} SQT allowance to ${operationName}?`,
      });
      if (!confirm) {
        throw new Error(`Allowance approval was cancelled. Cannot proceed with ${operationName}.`);
      }
    } else {
      logger.info('Auto-approving allowance in non-interactive mode');
    }

    logger.info(`Increasing allowance of SQT to ${operationName}...`);
    try {
      const allowanceTx = await sdk.sqToken.increaseAllowance(spender, needed);
      logger.info(`Allowance tx hash: ${allowanceTx.hash}`);
      await checkTransactionSuccess(allowanceTx);
    } catch (e) {
      console.error('Error increasing allowance', e);
      throw e;
    }
    logger.info(`✅ Successfully increased allowance of SQT to ${operationName}`);
  } else {
    logger.info('✅ Sufficient allowance already exists');
  }
}
