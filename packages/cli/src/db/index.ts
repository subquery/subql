import format from 'pg-format';
import { Connection, createConnection, getConnection } from 'typeorm';


export class PgConnection {
  static async create(): Promise<PgConnection> {
    const connection = await createConnection({
      type: 'postgres',
      url: 'postgres://postgres:postgres@localhost'
    });
    return new PgConnection(connection);
  }

  constructor(protected conn: Connection) {
  }

  async createSchema(name: string): Promise<void> {
    await this.conn.query(format('create schema %I;', name))
  }
}
