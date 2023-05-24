// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Inject, Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Sequelize} from 'sequelize';
import {NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {getLogger} from '../logger';
import {getExistingProjectSchema, initDbSchema} from '../utils/project';
import {MmrService} from './mmr.service';
import {PlainPoiModel} from './poi/poiModel';
import {StoreService} from './store.service';
import {CacheMetadataModel} from './storeCache/cacheMetadata';
import {ISubqueryProject} from './types';

const logger = getLogger('MMR-Regeneration');

const targetHeightHelpMsg = (suggestHeight: number, storeType: string) =>
  `\n To fix this: \n Option 1. You can try to add --targetHeight=${suggestHeight} to continue regeneration. \n Option 2. Use --unsafe mode, allow POI table copy missing MMR to ${storeType} DB first, in order to continue regeneration`;

@Injectable()
export class MmrRegenerateService {
  private metadataRepo?: CacheMetadataModel;
  private _schema?: string;
  private _dbMmrLatestHeight?: number;
  private _poiMmrLatestHeight?: number;
  private _lastPoiHeight?: number; // Final sync target height
  private _poi?: PlainPoiModel;
  private _blockOffset?: number;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    private readonly mmrService: MmrService,
    private eventEmitter: EventEmitter2,
    @Inject('ISubqueryProject') protected project: ISubqueryProject<any, any>
  ) {}

  async init(): Promise<void> {
    this._schema = await this.getExistingProjectSchema();
    await this.initDbSchema();
    this.eventEmitter.emit(IndexerEvent.Ready, {
      value: true,
    });
    this.metadataRepo = this.storeService.storeCache.metadata;
    this._blockOffset = await this.getMetadataBlockOffset();
    this._lastPoiHeight = await this.getMetadataLastPoiHeight();
    if (!this.storeService.poiRepo) {
      throw new Error(`Store service POI not initialized`);
    }
    this._poi = new PlainPoiModel(this.storeService.poiRepo);
    await this.mmrService.init(this.blockOffset, this.poi);
    await this.probeStatus();
  }

  get dbMmrLatestHeight(): number {
    if (this._dbMmrLatestHeight === undefined) {
      logger.warn(`Database latest MMR block height is not found, use default value ${this.blockOffset + 1}`);
      return this.blockOffset + 1;
    }
    return this._dbMmrLatestHeight;
  }

  get poiMmrLatestHeight(): number {
    assert(this._poiMmrLatestHeight !== undefined, 'Poi latest Mmr block height is undefined ');
    return this._poiMmrLatestHeight;
  }

  get lastPoiHeight(): number {
    if (this._lastPoiHeight === 0 || this._lastPoiHeight === undefined) {
      throw new Error(`Last POI height record is ${this._lastPoiHeight}. Don't need re-generation`);
    }
    return this._lastPoiHeight;
  }

  get blockOffset(): number {
    assert(this._blockOffset !== undefined, 'Poi offset is not found within metadata');
    return this._blockOffset;
  }

  get schema(): string {
    assert(this._schema, 'Get exist schema failed');
    return this._schema;
  }

  get poi(): PlainPoiModel {
    assert(this._poi, 'Poi Model not initialised');
    return this._poi;
  }

  private async probeStatus(): Promise<void> {
    this._dbMmrLatestHeight = await this.mmrService.getLatestMmrHeight();
    logger.info(`In ${this.nodeConfig.mmrStoreType} DB, latest MMR block height is ${this._dbMmrLatestHeight}`);
    this._poiMmrLatestHeight = (await this.mmrService.poi.getLatestPoiWithMmr())?.id ?? this.blockOffset;
    logger.info(`In POI table, latest MMR block height is ${this._poiMmrLatestHeight}`);
  }

  private async resetMmr(regenStartHeight: number): Promise<void> {
    // remove value in filebased/postgres
    await this.mmrService.deleteMmrNode(regenStartHeight + 1, this._blockOffset);
    // set null for mmr in POI table
    await this.poi.resetPoiMmr(this.poiMmrLatestHeight, regenStartHeight);
    logger.info(`Reset mmr on POI AND ${this.nodeConfig.mmrStoreType} DB both completed!`);
  }

  async regenerate(targetHeight?: number, resetOnly?: boolean, unsafe?: boolean): Promise<void> {
    if (targetHeight !== undefined && targetHeight < this.blockOffset) {
      throw new Error(`The target height must greater equal than ${this.blockOffset + 1}`);
    }
    // SAFE mode:

    // EXPECTED MMR height order:
    // filebased/postgres >= POI table >= targetHeight

    // If user provided targetHeight, will remove value in filebased/postgres, also set null for poi mmr with this height
    // then sync again

    // If user did not provide any target height
    // try to set targetHeight to be poi latest mmr height

    // Also validate poi latest mmr vs filebased/postgres mmr height
    // For example if filebased/postgres mmr was removed, it will start sync from filebased/postgres height,
    // which is block 0 + blockOffset, and override value in poi mmr

    // UNSAFE mode:
    // allow poi last mmr height ahead of filebased/postgres, sync poi mmr to filebased/postgres until last one.
    // Then back to normal sync loop

    if (!unsafe) {
      if (this.dbMmrLatestHeight < this.poiMmrLatestHeight) {
        if (targetHeight === undefined || targetHeight > this.dbMmrLatestHeight) {
          throw new Error(
            `The latest MMR height In POI table is ahead of ${this.nodeConfig.mmrStoreType} DB. ${targetHeightHelpMsg(
              this.dbMmrLatestHeight,
              this.nodeConfig.mmrStoreType
            )} `
          );
        }
        // other case pass, when targetHeight <= this.dbMmrLatestHeight, we will start from targetHeight
      } else if (targetHeight !== undefined && this.poiMmrLatestHeight < targetHeight) {
        throw new Error(
          `Re-generate --targetHeight ${targetHeight} is ahead of POI table latest MMR height ${
            this.poiMmrLatestHeight
          }. ${targetHeightHelpMsg(this.poiMmrLatestHeight, this.nodeConfig.mmrStoreType)}`
        );
      }
      // use undefined avoid 0
      const regenStartHeight = targetHeight !== undefined ? targetHeight : this.poiMmrLatestHeight;
      logger.info(
        `${resetOnly ? `Reset to` : `Regenerate from`} block ${Math.max(this.blockOffset + 1, regenStartHeight)} ${
          resetOnly ? `.` : `, final sync height will be ${this.lastPoiHeight}.`
        }`
      );
      await this.resetMmr(regenStartHeight);
    } else {
      logger.warn(`Unsafe mode is experimental`);

      const regenStartHeight = Math.min(
        this.poiMmrLatestHeight ?? this.blockOffset + 1,
        //isNaN(undefined) will lead type error
        targetHeight === undefined ? Infinity : targetHeight
      );

      if (targetHeight !== undefined && targetHeight > regenStartHeight) {
        logger.warn(
          `Target height is ahead of last mmr record height in POI table, will start sync from block ${regenStartHeight}`
        );
      }
      if (this.poiMmrLatestHeight !== undefined && regenStartHeight < this.poiMmrLatestHeight) {
        await this.poi.resetPoiMmr(this.poiMmrLatestHeight, regenStartHeight);
      }
      // Db mmr the latest height need to catch up regenStartHeight
      await this.mmrService.poiMmrToDb(this.dbMmrLatestHeight, regenStartHeight);
    }

    if (!resetOnly) {
      await this.mmrService.syncFileBaseFromPoi(this.blockOffset, this.lastPoiHeight, true);
    }
    logger.warn(`-------- Final status -------- `);
    await this.probeStatus();
  }

  private async getExistingProjectSchema(): Promise<string | undefined> {
    return getExistingProjectSchema(this.nodeConfig, this.sequelize);
  }

  private async initDbSchema(): Promise<void> {
    await initDbSchema(this.project, this.schema, this.storeService);
  }

  private async getMetadataBlockOffset(): Promise<number | undefined> {
    return this.metadataRepo?.find('blockOffset');
  }

  private async getMetadataLastPoiHeight(): Promise<number | undefined> {
    return this.metadataRepo?.find('lastPoiHeight');
  }
}
