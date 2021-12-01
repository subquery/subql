// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
import {Pool} from 'pg';
import {Config} from '../configure';

@Injectable()
export class ProjectService {
  constructor(private readonly pool: Pool, private readonly config: Config) {}

  async getProjectSchema(name: string): Promise<string> {
    // After subqueries table has been deprecated, project may not be present in subqueries table
    const result: [string] = await this.pool
      .query(`SELECT schema_name FROM  information_schema.schemata`)
      .then((obj) => obj.rows.map((x) => x.schema_name))
      .catch((e) => {
        throw new Error(`Unable to fetch all database schemas: ${e}`);
      });
    if (result.includes(name)) {
      return name;
    } else {
      // fallback to subqueries table
      const {rows} = await this.pool.query(
        `select *
        from public.subqueries
        where name = $1`,
        [name]
      );
      if (rows.length === 0) {
        throw new Error(`unknown project name ${this.config.get('name')}`);
      }
      return rows[0].db_schema;
    }
  }
}
