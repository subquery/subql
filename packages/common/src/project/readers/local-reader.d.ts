import { IPackageJson } from 'package-json-type';
import { Reader } from './reader';
export declare class LocalReader implements Reader {
    private readonly projectPath;
    constructor(projectPath: string);
    get root(): string;
    getPkg(): Promise<IPackageJson | undefined>;
    getProjectSchema(): Promise<unknown | undefined>;
    getFile(fileName: string): Promise<string | undefined>;
}
