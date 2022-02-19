export declare type TableEstimate = {
    table: string;
    estimate: number;
};
export declare type MetaData = {
    lastProcessedHeight: number;
    lastProcessedTimestamp: number;
    targetHeight: number;
    chain: string;
    specName: string;
    genesisHash: string;
    indexerHealthy: boolean;
    indexerNodeVersion: string;
    queryNodeVersion: string;
    rowCountEstimate: [TableEstimate];
};
export declare type TerraMetaData = {
    lastProcessedHeight: number;
    lastProcessedTimestamp: number;
    targetHeight: number;
    chainId: string;
    indexerHealthy: boolean;
    indexerNodeVersion: string;
    queryNodeVersion: string;
};
export declare type TerraMetaData = {
    lastProcessedHeight: number;
    lastProcessedTimestamp: number;
    targetHeight: number;
    chainId: string;
    indexerHealthy: boolean;
    indexerNodeVersion: string;
    queryNodeVersion: string;
};
