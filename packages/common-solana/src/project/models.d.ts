import { SubqlTerraEventFilter, SubqlTerraHandlerKind, SubqlTerraCustomHandler, SubqlTerraMapping, SubqlTerraHandler, SubqlTerraRuntimeHandler, SubqlTerraRuntimeDatasource, SubqlTerraDatasourceKind, SubqlTerraCustomDatasource, FileReference, CustomDataSourceAsset } from '@subql/types-terra';
export declare class TerraEventFilter implements SubqlTerraEventFilter {
    type: string;
}
export declare class TerraBlockHandler {
    kind: SubqlTerraHandlerKind.Block;
    handler: string;
}
export declare class TerraEventHandler {
    filter?: SubqlTerraEventFilter;
    kind: SubqlTerraHandlerKind.Event;
    handler: string;
}
export declare class TerraCustomHandler implements SubqlTerraCustomHandler {
    kind: string;
    handler: string;
    filter?: Record<string, unknown>;
}
export declare class TerraMapping implements SubqlTerraMapping {
    handlers: SubqlTerraHandler[];
    file: string;
}
export declare class TerraCustomMapping implements SubqlTerraMapping<SubqlTerraCustomHandler> {
    handlers: TerraCustomHandler[];
    file: string;
}
export declare class TerraRuntimeDataSourceBase<M extends SubqlTerraMapping<SubqlTerraRuntimeHandler>> implements SubqlTerraRuntimeDatasource<M> {
    kind: SubqlTerraDatasourceKind.Runtime;
    mapping: M;
    startBlock: number;
}
export declare class TerraFileReferenceImpl implements FileReference {
    file: string;
}
export declare class TerraCustomDataSourceBase<K extends string, M extends SubqlTerraMapping = SubqlTerraMapping<SubqlTerraCustomHandler>, O = any> implements SubqlTerraCustomDatasource<K, M, O> {
    kind: K;
    mapping: M;
    startBlock?: number;
    assets: Map<string, CustomDataSourceAsset>;
    processor: FileReference;
}
