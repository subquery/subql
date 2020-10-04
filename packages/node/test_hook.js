const async_hooks = require('async_hooks');
const fs = require('fs');

async function main() {
    const body = await new Promise((resolve) => {
        setTimeout(async () => {
            const res = await axios.get('https://www.google.com');
            resolve(res.data);
        }, 3000);
    });
    console.log(body);
}

// async function main() {
//     await new Promise((resolve) => {
//         setInterval(async () => {
//             console.log('.');
//         }, 1000);
//     });
// }

const asyncHook = async_hooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        // fs.writeSync(
        //     process.stdout.fd,
        //     `init: asyncId: ${asyncId}, type: ${type}, triggerAsyncId: ${triggerAsyncId}, resource: ${resource}`);
    },
    destroy(asyncId) {
        // fs.writeSync(
        //     process.stdout.fd,
        //     `init: destroy: ${asyncId}`);
    }
});
asyncHook.enable()
main();
// asyncHook.disable()