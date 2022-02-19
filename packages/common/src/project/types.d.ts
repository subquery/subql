export interface IProjectManifest<D> {
    specVersion: string;
    description: string;
    repository: string;
    dataSources: D[];
    toDeployment(): string;
    validate(): void;
}
export interface ProjectNetworkConfig {
    endpoint: string;
    dictionary?: string;
}
