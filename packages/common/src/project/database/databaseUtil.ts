// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SUPPORT_DB} from '@subql/common';
import {Pool} from 'pg';
import {Sequelize} from 'sequelize';

export async function getDbType(queryFrom: Sequelize | Pool): Promise<SUPPORT_DB> {
  const result = await (queryFrom as any).query('select version()');
  //  sequelize return an array,  Promise<[unknown[], unknown]
  //  pgPool return a single string object with rows
  const cleanResult = result instanceof Array ? result[0][0] : result.rows[0];
  const matchDB = Object.values(SUPPORT_DB).find((db) => (cleanResult as {version: string}).version.includes(db));
  if (!matchDB) {
    throw new Error(`Database type not supported, got ${result}`);
  }
  return matchDB;
}
