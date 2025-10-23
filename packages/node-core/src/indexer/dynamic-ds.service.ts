// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Inject, Injectable} from '@nestjs/common';
import {BaseCustomDataSource, BaseDataSource, BaseTemplateDataSource, DynamicDatasourceInfo} from '@subql/types-core';
import {Transaction} from '@subql/x-sequelize';
import {cloneDeep} from 'lodash';
import {IBlockchainService} from '../blockchain.service';
import {getLogger} from '../logger';
import {exitWithError} from '../process';
import {IMetadata} from './storeModelProvider';
import {ISubqueryProject} from './types';

const logger = getLogger('dynamic-ds');

const METADATA_KEY = 'dynamicDatasources';

export interface DatasourceParams {
  templateName: string;
  args?: Record<string, unknown>;
  startBlock: number;
  endBlock?: number;
}

export interface IDynamicDsService<DS> {
  dynamicDatasources: DS[];
  createDynamicDatasource(params: DatasourceParams): Promise<DS>;
  destroyDynamicDatasource(templateName: string, currentBlockHeight: number, index: number): Promise<void>;
  getDynamicDatasources(forceReload?: boolean): Promise<DS[]>;
  getDynamicDatasourcesByTemplate(templateName: string): DynamicDatasourceInfo[];
  getDatasourceParamByIndex(index: number): DatasourceParams | undefined;
}

@Injectable()
export class DynamicDsService<DS extends BaseDataSource = BaseDataSource, P extends ISubqueryProject = ISubqueryProject>
  implements IDynamicDsService<DS>
{
  private _metadata?: IMetadata;
  private _datasources?: DS[];
  private _datasourceParams?: DatasourceParams[];

  constructor(
    @Inject('ISubqueryProject') private readonly project: P,
    @Inject('IBlockchainService') private readonly blockchainService: IBlockchainService<DS>
  ) {}

  async init(metadata: IMetadata): Promise<void> {
    this._metadata = metadata;

    await this.getDynamicDatasources(true);
  }

  get dynamicDatasources(): DS[] {
    if (!this._datasources) {
      throw new Error('DynamicDsService has not been initialized');
    }
    return this._datasources;
  }

  private get metadata(): IMetadata {
    if (!this._metadata) {
      throw new Error('DynamicDsService has not been initialized');
    }
    return this._metadata;
  }

  /**
   * remove dynamic ds that is created after this height
   * @param targetHeight this height is exclusive
   */
  async resetDynamicDatasource(targetHeight: number, tx: Transaction): Promise<void> {
    if (this._datasourceParams && this._datasourceParams.length !== 0) {
      const filteredDs = this._datasourceParams.filter((ds) => ds.startBlock <= targetHeight);
      await this.metadata.set(METADATA_KEY, filteredDs, tx);
      await this.loadDynamicDatasources(filteredDs);
    }
  }

  // TODO make tx required
  async createDynamicDatasource(params: DatasourceParams, tx?: Transaction): Promise<DS> {
    try {
      const ds = await this.getDatasource(params);
      await this.metadata.setNewDynamicDatasource(params, tx);

      logger.info(`Created new dynamic datasource from template: "${params.templateName}"`);

      if (!this._datasources) this._datasources = [];
      if (!this._datasourceParams) this._datasourceParams = [];
      this._datasources.push(ds);
      this._datasourceParams.push(params);

      return ds;
    } catch (e: any) {
      exitWithError(new Error(`Failed to create dynamic ds`, {cause: e}), logger);
    }
  }

  /**
   * Get all active (non-destroyed) dynamic datasources for a specific template.
   *
   * @param templateName - The name of the template to filter by
   * @returns Array of datasource info objects with global indices. The `index` field
   *          represents the global position in the internal datasource array and should
   *          be used when calling `destroyDynamicDatasource()`.
   */
  getDynamicDatasourcesByTemplate(templateName: string): DynamicDatasourceInfo[] {
    if (!this._datasourceParams) {
      throw new Error('DynamicDsService has not been initialized');
    }

    const matchingDatasources = this._datasourceParams
      .map((params, globalIndex) => ({params, globalIndex}))
      .filter(({params}) => params.templateName === templateName && params.endBlock === undefined);

    return matchingDatasources.map(({globalIndex, params}) => ({
      index: globalIndex,
      templateName: params.templateName,
      startBlock: params.startBlock,
      endBlock: params.endBlock,
      args: params.args,
    }));
  }

  /**
   * Get datasource parameters by global index.
   *
   * @param index - Global index in the internal datasource parameters array
   * @returns DatasourceParams if found, undefined otherwise
   */
  getDatasourceParamByIndex(index: number): DatasourceParams | undefined {
    if (!this._datasourceParams || index < 0 || index >= this._datasourceParams.length) {
      return undefined;
    }
    return this._datasourceParams[index];
  }

  async destroyDynamicDatasource(
    templateName: string,
    currentBlockHeight: number,
    index: number,
    tx?: Transaction
  ): Promise<void> {
    if (!this._datasources || !this._datasourceParams) {
      throw new Error('DynamicDsService has not been initialized');
    }

    // Validate the global index is within bounds
    if (index < 0 || index >= this._datasourceParams.length) {
      throw new Error(
        `Index ${index} is out of bounds. There are ${this._datasourceParams.length} datasource(s) in total`
      );
    }

    // Get the datasource at the global index
    const dsParam = this._datasourceParams[index];

    // Validate it matches the template name and is not already destroyed
    if (dsParam.templateName !== templateName) {
      throw new Error(
        `Datasource at index ${index} has template name "${dsParam.templateName}", not "${templateName}"`
      );
    }

    if (dsParam.endBlock !== undefined) {
      throw new Error(`Dynamic datasource at index ${index} is already destroyed`);
    }

    // Update the datasource params
    const updatedParams = {...dsParam, endBlock: currentBlockHeight};
    this._datasourceParams[index] = updatedParams;

    // Update the datasource object if it exists
    // Note: _datasources and _datasourceParams arrays should always be in sync.
    // If the index is valid for params, it must also be valid for datasources.
    if (!this._datasources[index]) {
      throw new Error(`Datasources array out of sync with params at index ${index}`);
    }
    (this._datasources[index] as any).endBlock = currentBlockHeight;

    await this.metadata.set(METADATA_KEY, this._datasourceParams, tx);

    logger.info(`Destroyed dynamic datasource "${templateName}" at block ${currentBlockHeight}`);
  }

  // Not force only seems to be used for project changes
  async getDynamicDatasources(forceReload?: boolean): Promise<DS[]> {
    // Workers should not cache this result in order to keep in sync
    if (!this._datasources || forceReload) {
      const params = (await this.metadata.find(METADATA_KEY)) ?? [];

      await this.loadDynamicDatasources(params);
    }

    // loadDynamicDatasources ensures this is set
    return this._datasources as DS[];
  }

  private async loadDynamicDatasources(params: DatasourceParams[]): Promise<void> {
    const dataSources = await Promise.all(params.map((params) => this.getDatasource(params)));

    logger.info(`Loaded ${dataSources.length} dynamic datasources`);
    this._datasourceParams = params;
    this._datasources = dataSources;
  }

  /**
   * Finds the template based on name and gives a cloned version that can be used to construct a datasource.
   *
   * This will throw if the template cannot be found by name.
   *
   * Inserts the startBlock and optionally endBlock into the template.
   * */
  protected getTemplate(templateName: string, startBlock?: number, endBlock?: number): DS {
    const t = (this.project.templates ?? []).find((t) => t.name === templateName);
    if (!t) {
      throw new Error(`Unable to find matching template in project for name: "${templateName}"`);
    }
    const {name, ...template} = cloneDeep(t);
    return {...template, startBlock, endBlock} as DS;
  }

  private async getDatasource(params: DatasourceParams): Promise<DS> {
    const dsObj = this.getTemplate(params.templateName, params.startBlock, params.endBlock);

    try {
      await this.blockchainService.updateDynamicDs(params, dsObj);

      return dsObj;
    } catch (e) {
      throw new Error(`Unable to create dynamic datasource.\n ${(e as any).message}`);
    }
  }
}
