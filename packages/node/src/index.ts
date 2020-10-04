// import {NodeVM, VMScript} from 'vm2';
// import fs from 'fs';
//
// const vm = new NodeVM({
//     console: 'inherit',
//     sandbox: {},
//     timeout: 3,
//     require: {
//         external: false,
//         builtin: ['process'],
//         // builtin: ['fs', 'path'],
//         root: "./demo",
//         mock: {
//             fs: {
//                 // readFileSync() { return 'Nice try!'; }
//             },
//             https: {
//                 request() {}
//             },
//             http: {
//                 request() {}
//             },
//         }
//     }
// });
//
// // const vm = new NodeVM();
// const script = new VMScript(fs.readFileSync('./demo/main.js').toString(), './demo/main.js');
// // const script = new VMScript(fs.readFileSync('./demo/dist/bundle.js'), './demo/dist/bundle.js');
// console.log(vm.run(script));
// setInterval(async () => {
//     console.log('host', process.memoryUsage());
// }, 5000);

import {initApi, load} from "./runner/loader";

global['store'] = {
    set(id: string){
        console.log('store set ', id);
    }
}

async function main() {
    const endpoint = 'wss://node-6709705378736259072.sy.onfinality.me/ws?apikey=802f214f-430e-4a21-9029-b7e32db02659';


    const func = await load('../../examples/validator-threshold-amount/node_modules', '/Users/ian/Workspace/onfinality/polkagraph-node/examples/validator-threshold-amount/dist/mappings/ValidatorThreshold', 'handleBlock');
    console.log('find func:', func);

    const api = await initApi(endpoint);
    global['api'] = api;


    const b = await api.rpc.chain.getBlock();
    console.log('func exec start')
    await func(b);
    console.log('func exec end')
}
main();
