import { IProjectManifest, ProjectNetworkConfig } from '@subql/common';
import { SubqlTerraDatasource } from '@subql/types-terra';
export declare type ITerraProjectManifest = IProjectManifest<SubqlTerraDatasource>;
export interface TerraProjectNetworkConfig extends ProjectNetworkConfig {
    chainId?: string;
}
