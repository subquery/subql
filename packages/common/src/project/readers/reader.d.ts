import { IPackageJson } from 'package-json-type';
export declare type ReaderOptions = {
    ipfs: string;
};
export interface Reader {
    getProjectSchema(): Promise<unknown | undefined>;
    getPkg(): Promise<IPackageJson | undefined>;
    getFile(file: string): Promise<string | undefined>;
    root: string | undefined;
}
export declare class ReaderFactory {
    static create(location: string, options?: ReaderOptions): Promise<Reader>;
}
