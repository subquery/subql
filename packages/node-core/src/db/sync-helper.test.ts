// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {delay} from '@subql/common';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {DbModule} from './db.module';
import {createSendNotificationTriggerFunction, createNotifyTrigger, getDbSizeAndUpdateMetadata} from './sync-helper';

const nodeConfig = new NodeConfig({subquery: 'packages/node-core/test/v1.0.0', subqueryName: 'test'});

describe('sync helper test', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let schema: string;

  afterEach(async () => {
    await sequelize.dropSchema(schema, {});
    await sequelize.close();
    return app?.close();
  });

  it('can check project db size', async () => {
    const module = await Test.createTestingModule({
      imports: [DbModule.forRootWithConfig(nodeConfig)],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    sequelize = app.get(Sequelize);
    schema = 'admin-test';
    await sequelize.createSchema(schema, {});
    // mock create metadata table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"._metadata (
        key VARCHAR(255) NOT NULL PRIMARY KEY,
        value JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    )`);
    const dbSize = await getDbSizeAndUpdateMetadata(sequelize, schema);
    expect(dbSize).not.toBeUndefined();
  }, 50000);

  describe('has the correct notification trigger payload', () => {
    let client: unknown;

    afterEach(async () => {
      if (client) {
        await (client as any).query('UNLISTEN "0xc4e66f9e1358fa3c"');
        (client as any).removeAllListeners('notification');
        sequelize.connectionManager.releaseConnection(client);
      }
    });

    it('without historical', async () => {
      const module = await Test.createTestingModule({
        imports: [DbModule.forRootWithConfig(nodeConfig)],
      }).compile();

      app = module.createNestApplication();
      await app.init();
      sequelize = app.get(Sequelize);
      schema = 'trigger-test';
      const tableName = 'test';
      await sequelize.createSchema(schema, {});
      // mock create metadata table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${schema}".${tableName} (
          id text NOT NULL,
          block_number int4 NOT NULL
      )`);

      await sequelize.query(createSendNotificationTriggerFunction(schema));
      await sequelize.query(createNotifyTrigger(schema, tableName));

      client = await sequelize.connectionManager.getConnection({
        type: 'read',
      });

      await (client as any).query('LISTEN "0xc4e66f9e1358fa3c"');

      const listener = jest.fn();
      (client as any).on('notification', (msg: any) => {
        console.log('Payload:', msg.payload);
        listener(msg.payload);
      });

      await sequelize.query(`INSERT INTO "${schema}".${tableName} (id, block_number) VALUES ('1', 1);`);
      await sequelize.query(`UPDATE "${schema}".${tableName} SET block_number = 2 WHERE id = '1';`);
      await sequelize.query(`DELETE FROM "${schema}".${tableName} WHERE id = '1';`);
      await delay(1);
      expect(listener).toHaveBeenNthCalledWith(
        1,
        `{"id": "1", "_entity": {"id": "1", "block_number": 1}, "mutation_type": "INSERT"}`
      );
      expect(listener).toHaveBeenNthCalledWith(
        2,
        `{"id": "1", "_entity": {"id": "1", "block_number": 2}, "mutation_type": "UPDATE"}`
      );
      expect(listener).toHaveBeenNthCalledWith(
        3,
        `{"id": "1", "_entity": {"id": "1", "block_number": 2}, "mutation_type": "DELETE"}`
      );
    }, 10_000);

    it('with historical', async () => {
      const module = await Test.createTestingModule({
        imports: [DbModule.forRootWithConfig(nodeConfig)],
      }).compile();

      app = module.createNestApplication();
      await app.init();
      sequelize = app.get(Sequelize);
      schema = 'trigger-test';
      const tableName = 'test';
      await sequelize.createSchema(schema, {});
      // mock create metadata table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${schema}".${tableName} (
          id text NOT NULL,
          block_number int4 NOT NULL,
          "_id" uuid NOT NULL,
          "_block_range" int8range NOT NULL,
          CONSTRAINT test_pk PRIMARY KEY (_id)
      )`);

      await sequelize.query(createSendNotificationTriggerFunction(schema));
      await sequelize.query(createNotifyTrigger(schema, tableName));

      client = await sequelize.connectionManager.getConnection({
        type: 'read',
      });

      await (client as any).query('LISTEN "0xc4e66f9e1358fa3c"');

      const listener = jest.fn();

      (client as any).on('notification', (msg: any) => {
        console.log('Payload:', msg.payload);
        listener(msg.payload);
      });

      // Insert
      await sequelize.query(
        `INSERT INTO "${schema}".${tableName} (id, block_number, _id, _block_range) VALUES ('1', 1, 'adde2f8c-cb87-4e84-9600-77f434556e6d', int8range(1, NULL));`
      );

      // Simulate Update
      const tx1 = await sequelize.transaction();
      await sequelize.query(
        `INSERT INTO "${schema}".${tableName} (id, block_number, _id, _block_range) VALUES ('1', 2, '9396aca4-cef2-4b52-98a7-c5f1ed3edb81', int8range(2, NULL));`
      );
      await sequelize.query(
        `UPDATE "${schema}".${tableName} SET block_number = 2, _block_range = int8range(1, 2) WHERE _id = 'adde2f8c-cb87-4e84-9600-77f434556e6d';`,
        {transaction: tx1}
      );
      await tx1.commit();

      // Simulate delete
      const tx2 = await sequelize.transaction();
      await sequelize.query(
        `UPDATE "${schema}".${tableName} SET _block_range = int8range(2, 3) WHERE _id = '9396aca4-cef2-4b52-98a7-c5f1ed3edb81';`,
        {transaction: tx2}
      );
      await tx2.commit();

      await delay(1);
      // There is a limitation with our historical implementation where with the order or queries means we cant easily determine the difference between insert and update.
      // For that reason the behaviour is kept the same as before delete was fixed.
      expect(listener).toHaveBeenNthCalledWith(
        1,
        `{"id": "1", "_entity": {"id": "1", "block_number": 1}, "mutation_type": "UPDATE"}`
      );
      expect(listener).toHaveBeenNthCalledWith(
        2,
        `{"id": "1", "_entity": {"id": "1", "block_number": 2}, "mutation_type": "UPDATE"}`
      );
      expect(listener).toHaveBeenNthCalledWith(
        3,
        `{"id": "1", "_entity": {"id": "1", "block_number": 2}, "mutation_type": "DELETE"}`
      );
    }, 10_000);
  });
});
