import amp from 'app-module-path';
// import {ApiPromise, WsProvider} from '@polkadot/api';
// import { HttpProvider } from '@polkadot/rpc-provider';
import assert from "assert";

export async function load(root: string, file: string, funcName: string): Promise<Function> {
    amp.addPath(root);
    const exports = await import(file);
    const func = exports[funcName];
    assert(typeof func === 'function', 'mapping handler must be function');

    return func as Function;
}

export async function initApi(endpoint: string) {
    // amp.addPath('../../examples/validator-threshold-amount/node_modules');
    // @ts-ignore
    const {ApiPromise, WsProvider} = await import('@polkadot/api');
    // @ts-ignore
    const {HttpProvider} = await import('@polkadot/rpc-provider');
    return ApiPromise.create({ provider: new WsProvider(endpoint) });
}
