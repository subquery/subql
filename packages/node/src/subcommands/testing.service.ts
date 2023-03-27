// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { assert } from 'console';
import { Inject, Injectable } from '@nestjs/common';
import { ApiService, NodeConfig, StoreService } from '@subql/node-core';
import { HandlerFunction } from '@subql/testing';
import { Entity } from '@subql/types';
import { getAllEntitiesRelations } from '@subql/utils';
import { CreationAttributes, Model, Options, Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { IndexerManager } from '../indexer/indexer.manager';
import { fetchBlocksBatches } from '../utils/substrate';

@Injectable()
export class TestingService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    @Inject('ISubqueryProject') private project: SubqueryProject,
    private readonly apiService: ApiService,
    private readonly indexerManager: IndexerManager,
  ) {}

  private async runTest(test: {
    name: string;
    blockHeight: number;
    dependentEntities: Entity[];
    expectedEntities: Entity[];
    handler: HandlerFunction;
  }) {
    // Fetch block
    //TODO: this should be used made general for all networks.
    // create a mapping to get the right fetch function based on the network?
    const [block] = await fetchBlocksBatches(this.apiService.api, [
      test.blockHeight,
    ]);

    // Check filters match

    // Init db
    const modelRelations = getAllEntitiesRelations(this.project.schema);
    for (let i = 0; i < modelRelations.models.length; i++) {
      modelRelations.models[i].name = `Test${modelRelations.models[i].name}`;
    }
    await this.storeService.init(modelRelations, 'public');

    const store = this.storeService.getStore();

    // Init entities
    test.dependentEntities.map(async (entity) => {
      await store.set(`Test${entity.name}`, entity.id, entity);
    });

    // Run handler
    //TODO: check what kind of handler is this
    test.handler(block);

    // Check expected entities
    for (let i = 0; i < test.expectedEntities.length; i++) {
      const expectedEntity = test.expectedEntities[i];
      const actualEntity = await store.get(
        `Test${expectedEntity.name}`,
        expectedEntity.id,
      );
      const attributes = actualEntity as unknown as CreationAttributes<Model>;
      attributes.map((attr) =>
        assert(
          expectedEntity[attr] === actualEntity[attr],
          `AssertionFailedError on ${expectedEntity.name}.${attr}: expected: ${expectedEntity[attr]}, actual: ${actualEntity[attr]}`,
        ),
      );
    }
  }
}
