import path from 'path';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { buildSchema, getAllEntities, SubqlKind } from '@subql/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeVM, VMScript } from 'vm2';
import { ApiPromise } from '@polkadot/api';
import { SignedBlock } from '@polkadot/types/interfaces';
import { Subject } from 'rxjs';
import { objectTypeToModelAttributes } from '../utils/graphql';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { SubqueryProject } from '../configure/project.model';
import { delay } from '../utils/promise';
import { StoreService } from './store.service';
import { ApiService } from './api.service';

const PRELOAD_BLOCKS = 10;

@Injectable()
export class IndexerManager implements OnApplicationBootstrap {
  private vm: NodeVM;
  private api: ApiPromise;
  private latestFinalizedHeight: number;
  private lastPreparedHeight: number;
  private subqueryState: SubqueryModel;
  private block$: Subject<SignedBlock> = new Subject();

  constructor(
    protected apiService: ApiService,
    protected storeService: StoreService,
    protected sequelize: Sequelize,
    protected project: SubqueryProject,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    @Inject('SUBQUERY_PROJECT_NAME') protected subqueryName: string,
  ) {
    // this.block$.subscribe((block) => {});
  }

  async indexBlock(block: SignedBlock): Promise<void> {
    // TODO: find block handlers and call them
    for (const ds of this.project.dataSources) {
      if (ds.kind === SubqlKind.Runtime) {
        for (const handler of ds.mapping.handlers) {
          if (handler.kind === SubqlKind.BlockHandler) {
            await this.securedExec(handler.handler, [block]);
          }
          // TODO: support call handler and event handler
        }
      }
      // TODO: support Ink! and EVM
    }
    this.subqueryState.nextBlockHeight = block.block.header.number.toNumber();
    await this.subqueryState.save();
  }

  async onApplicationBootstrap(): Promise<void> {
    this.api = await this.apiService.getApi();
    this.subqueryState = await this.ensureProject(this.subqueryName);
    await this.initDbSchema();
    await this.api.rpc.chain.subscribeFinalizedHeads((head) => {
      this.latestFinalizedHeight = head.number.toNumber();
    });
    this.initVM();
    void this.prepareBlock().catch((err) => {
      console.error('prepare block fails', err);
      // FIXME: retry before exit
      process.exit(1);
    });
    this.block$.subscribe(this.indexBlock.bind(this));
  }

  private async prepareBlock() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let blockHeight: number;
      if (!this.lastPreparedHeight) {
        blockHeight = this.subqueryState.nextBlockHeight;
      } else if (
        this.lastPreparedHeight - this.subqueryState.nextBlockHeight + 1 <
        PRELOAD_BLOCKS
      ) {
        blockHeight = this.lastPreparedHeight + 1;
      } else {
        await delay(1);
        continue;
      }
      if (blockHeight > this.latestFinalizedHeight) {
        await delay(1);
        continue;
      }
      console.log('fetch block ', blockHeight);
      const blockHash = await this.api.rpc.chain.getBlockHash(blockHeight);
      const block = await this.api.derive.chain.getBlock(blockHash);
      this.block$.next(block);
      this.lastPreparedHeight = blockHeight;
    }
  }

  private initVM() {
    this.vm = new NodeVM({
      console: 'redirect',
      wasm: false,
      sandbox: {
        store: this.storeService.getStore(),
        api: this.apiService.getApi(),
      },
      require: {
        builtin: ['assert'],
        external: ['tslib'],
        root: this.project.path,
        context: 'sandbox',
      },
      wrapper: 'commonjs',
    });
  }

  private async securedExec(handler: string, args: any[]): Promise<void> {
    this.vm.setGlobal('args', args);
    const script = new VMScript(
      `
      const {${handler}: handler} = require('./dist');
      module.exports = handler(...args);
    `,
      path.join(this.project.path, 'sandbox'),
    );
    await this.vm.run(script);
    this.vm.setGlobal('args', []);
  }

  private async ensureProject(name: string): Promise<SubqueryModel> {
    let project = await this.subqueryRepo.findOne({
      where: { name: this.subqueryName },
    });
    if (!project) {
      const suffix = await this.nextSubquerySchemaSuffix();
      const projectSchema = `subquery_${suffix}`;
      const schemas = await this.sequelize.showAllSchemas(undefined);
      if (!((schemas as any) as string[]).includes(projectSchema)) {
        await this.sequelize.createSchema(projectSchema, undefined);
      }
      project = await this.subqueryRepo.create({
        name,
        dbSchema: projectSchema,
        hash: '0x',
      });
    }
    return project;
  }

  private async initDbSchema(): Promise<void> {
    const schema = this.subqueryState.dbSchema;
    const graphqlSchema = buildSchema(
      path.join(this.project.path, this.project.schema),
    );
    const models = getAllEntities(graphqlSchema).map((entity) => {
      const modelAttributes = objectTypeToModelAttributes(entity);
      return { name: entity.name, attributes: modelAttributes };
    });
    await this.storeService.syncSchema(models, schema);
    return;
  }

  private async nextSubquerySchemaSuffix(): Promise<number> {
    const seqExists = await this.sequelize.query(
      `SELECT 1
       FROM information_schema.sequences
       where sequence_schema = 'public'
         and sequence_name = 'subquery_schema_seq'`,
      {
        type: QueryTypes.SELECT,
      },
    );
    if (!seqExists.length) {
      await this.sequelize.query(
        `CREATE SEQUENCE subquery_schema_seq as integer START 1;`,
        { type: QueryTypes.RAW },
      );
    }
    const [{ nextval }] = await this.sequelize.query(
      `SELECT nextval('subquery_schema_seq')`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return Number(nextval);
  }
}
