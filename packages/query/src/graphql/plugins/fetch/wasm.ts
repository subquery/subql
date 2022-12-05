import orderByBlockHeight from "./base_entity_block_height"

export const OrderCW20TransfersByBlockHeight = orderByBlockHeight("cw20_transfers");
export const OrderCW20BalanceChangesByBlockHeight = orderByBlockHeight("cw20_balance_changes");
export const OrderLegacyBridgeSwapsByBlockHeight = orderByBlockHeight("legacy_bridge_swaps");
export const OrderIBCTransfersByBlockHeight = orderByBlockHeight("ibc_transfers");
export const OrderExecuteContractMessagesBy = orderByBlockHeight("execute_contract_messages");
