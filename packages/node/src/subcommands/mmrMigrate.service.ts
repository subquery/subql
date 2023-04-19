// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'fs';
import {
  NodeConfig,
  getExistingProjectSchema,
  getLogger,
  PgBasedMMRDB,
} from '@subql/node-core';
import { MMR, FileBasedDb } from '@subql/x-merkle-mountain-range';
import { keccak256 } from 'js-sha3';
import { Sequelize } from 'sequelize';

const logger = getLogger('mmr-migrate');

const keccak256Hash = (...nodeValues: Uint8Array[]) =>
  Buffer.from(keccak256(Buffer.concat(nodeValues)), 'hex');

export class MMRMigrateService {
  constructor(private sequelize: Sequelize, private nodeConfig: NodeConfig) {}

  async migrate(): Promise<void> {
    if (!existsSync(this.nodeConfig.mmrPath)) {
      logger.info(`MMR file does not found: ${this.nodeConfig.mmrPath}`);
      return;
    }

    const fileBasedMMRDb = await FileBasedDb.open(this.nodeConfig.mmrPath);
    const pgBasedMMRDb = new PgBasedMMRDB(
      this.sequelize,
      await getExistingProjectSchema(this.nodeConfig, this.sequelize),
    );
    await pgBasedMMRDb.connect();

    const pgBasedMMR = new MMR(keccak256Hash, pgBasedMMRDb);

    const nodes = await fileBasedMMRDb.getNodes();
    const sortedNodes = Object.fromEntries(
      Object.entries(nodes).sort(([a], [b]) => a.localeCompare(b)),
    );
    await pgBasedMMR.appendMany(
      Object.values(sortedNodes),
      Object.keys(sortedNodes)[0],
    );
  }
}
