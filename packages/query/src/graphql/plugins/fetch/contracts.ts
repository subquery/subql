import orderContractsByCodeId from "./base_contract_code_id";


export const OrderContractsByStoreMsgCodeId = orderContractsByCodeId("store_contract_messages", "store_message_id");
export const OrderContractsByInstantiateMsgCodeId = orderContractsByCodeId("instantiate_contract_messages", "instantiate_message_id");
