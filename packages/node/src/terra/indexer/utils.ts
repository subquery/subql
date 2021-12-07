import fs from 'fs';
import path from 'path';
import { loadFromJsonOrYaml } from '@subql/common';
import {
  SecondLayerTerraHandlerProcessor,
  SubqlTerraCustomDatasource,
  SubqlTerraDatasource,
  SubqlTerraDatasourceKind,
  SubqlTerraHandlerKind,
  SubqlTerraRuntimeDatasource,
  TerraProjectManifest,
} from './terraproject';

export function isCustomTerraDs(
  ds: SubqlTerraDatasource,
): ds is SubqlTerraCustomDatasource<string> {
  return (
    ds.kind !== SubqlTerraDatasourceKind.Runtime &&
    !!(ds as SubqlTerraCustomDatasource<string>).processor
  );
}

export function isRuntimeTerraDs(
  ds: SubqlTerraDatasource,
): ds is SubqlTerraRuntimeDatasource {
  return ds.kind === SubqlTerraDatasourceKind.Runtime;
}

function loadFromFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return loadFromJsonOrYaml(filePath);
}

export function loadTerraProjectManifest(file: string): TerraProjectManifest {
  const doc = loadFromFile(file);
  //perform validation
  return doc as TerraProjectManifest;
}

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown>,
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Block, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Block;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind, unknown>,
): hp is SecondLayerTerraHandlerProcessor<SubqlTerraHandlerKind.Event, E> {
  return hp.baseHandlerKind === SubqlTerraHandlerKind.Event;
}
