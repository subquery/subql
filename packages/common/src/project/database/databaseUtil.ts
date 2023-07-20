// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize} from '@subql/x-sequelize';
import {Pool} from 'pg';
import {SUPPORT_DB} from '../../constants';

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
