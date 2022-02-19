import { SubqlTerraDatasource } from '@subql/types-terra';
import { ITerraProjectManifest } from '../types';
import { ProjectManifestV0_3_0Impl } from './v0_3_0';
export declare type VersionedProjectManifest = {
    specVersion: string;
};
declare const SUPPORTED_VERSIONS: {
    '0.3.0': typeof ProjectManifestV0_3_0Impl;
};
declare type Versions = keyof typeof SUPPORTED_VERSIONS;
declare type ProjectManifestImpls = InstanceType<typeof SUPPORTED_VERSIONS[Versions]>;
export declare function manifestIsV0_3_0(manifest: ITerraProjectManifest): manifest is ProjectManifestV0_3_0Impl;
export declare class ProjectManifestVersioned implements ITerraProjectManifest {
    private _impl;
    constructor(projectManifest: VersionedProjectManifest);
    get asImpl(): ProjectManifestImpls;
    get isV0_3_0(): boolean;
    get asV0_3_0(): ProjectManifestV0_3_0Impl;
    toDeployment(): string | undefined;
    validate(): void;
    get dataSources(): SubqlTerraDatasource[];
    get schema(): string;
    get specVersion(): string;
    get description(): string;
    get repository(): string;
}
export {};
