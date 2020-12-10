import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { IndexerManager } from './indexer.manager';
import { StoreService } from './store.service';
import { ApiService } from './api.service';

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [IndexerManager, StoreService, ApiService],
  exports: [],
})
export class IndexerModule {}
