import {makeAddPgTableOrderByPlugin, orderByAscDesc} from "graphile-utils";

export default function orderByBlockHeight(table: string) {
  return makeAddPgTableOrderByPlugin(
    "app",
    table,
    ({pgSql: sql}) => {
      const sql_identifier = sql.identifier(Symbol("block"));
      return orderByAscDesc(
        `${table.toUpperCase()}_BY_BLOCK_HEIGHT`,
        ({queryBuilder}) => sql.fragment`(
        select ${sql_identifier}.height
        from app.blocks as ${sql_identifier}
        where ${sql_identifier}.id = ${queryBuilder.getTableAlias()}.block_id
        order by ${sql_identifier}.height
      )`
      );
    }
  )
}
