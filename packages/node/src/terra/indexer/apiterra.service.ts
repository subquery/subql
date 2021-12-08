import { Injectable } from '@nestjs/common';
import { LCDClient, LCDClientConfig } from '@terra-money/terra.js';
import { EventEmitter2 } from 'eventemitter2';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { getLogger } from '../utils/logger';
import { NetworkMetadataPayload } from './events';

const logger = getLogger('api');

@Injectable()
export class ApiTerraService {
  private api: LCDClient;
  private currentBlockHash: string;
  private clientConfig: LCDClientConfig;
  networkMeta: NetworkMetadataPayload;

  constructor(
    protected project: SubqueryTerraProject,
    private eventEmitter: EventEmitter2,
  ) {}

  async init(): Promise<ApiTerraService> {
    const { network } = this.project;
    this.clientConfig = {
      URL: network.endpoint,
      chainID: network.chainId,
    };
    this.api = new LCDClient(this.clientConfig);

    const genesisBlock = await this.api.tendermint.blockInfo(0);

    this.networkMeta = {
      chain: network.chainId,
      genesisHash: genesisBlock.block.header.data_hash,
    };

    if (
      network.genesisHash &&
      network.genesisHash !== this.networkMeta.genesisHash
    ) {
      const err = new Error(
        `Network genesisHash doesn't match expected genesisHash. expected="${network.genesisHash}" actual="${this.networkMeta.genesisHash}`,
      );
      logger.error(err, err.message);
      throw err;
    }

    return this;
  }

  getApi(): LCDClient {
    return this.api;
  }
}
