import { IPackageJson } from 'package-json-type';
import { Reader } from './reader';
export declare class IPFSReader implements Reader {
    private readonly cid;
    private ipfs;
    constructor(cid: string, gateway: string);
    get root(): undefined;
    getPkg(): Promise<IPackageJson | undefined>;
    getProjectSchema(): Promise<unknown | undefined>;
    getFile(fileName: string): Promise<string | undefined>;
}
