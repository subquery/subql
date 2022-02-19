import { DataTypes } from 'sequelize';
declare type ValueOf<T> = T[keyof T];
export declare type SequelizeTypes = string | ValueOf<typeof DataTypes>;
export declare class TypeClass {
    name: string;
    private _hashCode;
    private _tsType?;
    private _fieldScalar?;
    private _sequelizeType?;
    constructor(name: string, _hashCode: (data: unknown) => Uint8Array, _tsType?: string, _fieldScalar?: string, _sequelizeType?: SequelizeTypes);
    get tsType(): string | undefined;
    get fieldScalar(): string | undefined;
    get sequelizeType(): SequelizeTypes;
    hashCode(data: any): Uint8Array;
}
export {};
