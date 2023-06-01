// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {EthereumLog, EthereumTransaction} from '@subql/types-ethereum';

import {ApprovalEvent, ApprovalForAllEvent, TransferEvent, Erc721} from '../contracts/Erc721';

export type ApprovalLog = EthereumLog<ApprovalEvent['args']>;

export type ApprovalForAllLog = EthereumLog<ApprovalForAllEvent['args']>;

export type TransferLog = EthereumLog<TransferEvent['args']>;

export type ApproveTransaction = EthereumTransaction<Parameters<Erc721['functions']['approve']>>;

export type BalanceOfTransaction = EthereumTransaction<Parameters<Erc721['functions']['balanceOf']>>;

export type BaseURITransaction = EthereumTransaction<Parameters<Erc721['functions']['baseURI']>>;

export type GetApprovedTransaction = EthereumTransaction<Parameters<Erc721['functions']['getApproved']>>;

export type IsApprovedForAllTransaction = EthereumTransaction<Parameters<Erc721['functions']['isApprovedForAll']>>;

export type NameTransaction = EthereumTransaction<Parameters<Erc721['functions']['name']>>;

export type OwnerOfTransaction = EthereumTransaction<Parameters<Erc721['functions']['ownerOf']>>;

export type SafeTransferFrom_address_address_uint256_Transaction = EthereumTransaction<
  Parameters<Erc721['functions']['safeTransferFrom(address,address,uint256)']>
>;

export type SafeTransferFrom_address_address_uint256_bytes_Transaction = EthereumTransaction<
  Parameters<Erc721['functions']['safeTransferFrom(address,address,uint256,bytes)']>
>;

export type SetApprovalForAllTransaction = EthereumTransaction<Parameters<Erc721['functions']['setApprovalForAll']>>;

export type SupportsInterfaceTransaction = EthereumTransaction<Parameters<Erc721['functions']['supportsInterface']>>;

export type SymbolTransaction = EthereumTransaction<Parameters<Erc721['functions']['symbol']>>;

export type TokenByIndexTransaction = EthereumTransaction<Parameters<Erc721['functions']['tokenByIndex']>>;

export type TokenOfOwnerByIndexTransaction = EthereumTransaction<
  Parameters<Erc721['functions']['tokenOfOwnerByIndex']>
>;

export type TokenURITransaction = EthereumTransaction<Parameters<Erc721['functions']['tokenURI']>>;

export type TotalSupplyTransaction = EthereumTransaction<Parameters<Erc721['functions']['totalSupply']>>;

export type TransferFromTransaction = EthereumTransaction<Parameters<Erc721['functions']['transferFrom']>>;
