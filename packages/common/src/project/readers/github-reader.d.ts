import { IPackageJson } from 'package-json-type';
import { Reader } from './reader';
export declare class GithubReader implements Reader {
    private readonly key;
    private readonly api;
    private defaultBranch;
    constructor(key: string);
    get root(): undefined;
    getPkg(): Promise<IPackageJson | undefined>;
    getProjectSchema(): Promise<unknown | undefined>;
    getFile(fileName: string): Promise<string | undefined>;
    private getDefaultBranch;
}
