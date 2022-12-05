import orderByBlockHeight from "./base_entity_block_height"

export const OrderTransactionsByBlockHeight = orderByBlockHeight("transactions");
export const OrderEventsByBlockHeight = orderByBlockHeight("events");
export const OrderMessagesByBlockHeight = orderByBlockHeight("messages");
