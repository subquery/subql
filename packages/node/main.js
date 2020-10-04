const {NodeVM, VMScript} = require('vm2');
const fs = require('fs');

const vm = new NodeVM({
    console: 'inherit',
    sandbox: {},
    timeout: 3,
    require: {
        external: false,
        builtin: ['process'],
        // builtin: ['fs', 'path'],
        root: "./demo",
        mock: {
            fs: {
                readFileSync() { return 'Nice try!'; }
            },
            https: {
                request() {}
            },
            http: {
                request() {}
            },
        }
    }
});

// const vm = new NodeVM();
const script = new VMScript(fs.readFileSync('./demo/main.js'), './demo/main.js');
// const script = new VMScript(fs.readFileSync('./demo/dist/bundle.js'), './demo/dist/bundle.js');
console.log(vm.run(script));
setInterval(async () => {
    console.log('host', process.memoryUsage());
}, 5000);
