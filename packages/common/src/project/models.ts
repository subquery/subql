import {IsArray, IsEnum, IsString} from 'class-validator';
import {Type} from 'class-transformer';
import {
  ProjectManifest,
  SubqlBlockFilter,
  SubqlBlockHandler,
  SubqlDataSource,
  SubqlMapping,
  SubqlRuntimeDatasource,
} from './types';
import {SubqlKind} from './constants';

export class ProjectManifestImpl implements ProjectManifest {
  @IsString()
  description: string;
  @IsString()
  endpoint: string;
  @IsString()
  repository: string;
  @IsString()
  schema: string;
  @IsString()
  specVersion: string;
  @IsArray()
  dataSources: SubqlDataSource[];
}

export class BlockHandler implements SubqlBlockHandler {
  filter: SubqlBlockFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.BlockHandler]})
  kind: SubqlKind.BlockHandler;
  handler: string;
}

export class Mapping implements SubqlMapping {
  @Type(() => BlockHandler)
  @IsArray()
  handlers: SubqlBlockHandler[];
}

export class RuntimeDataSource implements SubqlRuntimeDatasource {
  @IsEnum(SubqlKind, {groups: [SubqlKind.Runtime]})
  kind: SubqlKind.Runtime;
  @Type(() => Mapping)
  mapping: SubqlMapping;
  name: string;
  startBlock: number;
}
