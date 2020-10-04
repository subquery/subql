import {NodeVM, VMScript} from 'vm2';

export function createVM(root: string, global?: any): NodeVM {
    return  new NodeVM({
        console: 'inherit',
        sandbox: global ?? {},
        require: {
            external: true,
            // builtin: ['fs', 'path'],
            root: root,
        }
    });
}
