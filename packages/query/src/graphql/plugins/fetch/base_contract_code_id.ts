import {makeAddPgTableOrderByPlugin, orderByAscDesc} from "graphile-utils";

export default function orderContractsByCodeId(foreign_key: string, key_field: string) {
  return makeAddPgTableOrderByPlugin(
    "app",
    "contracts",
    ({pgSql: sql}) => {
    const sql_identifier = sql.identifier(Symbol("store_contract_message"));
    const sql_foreign_key = sql.identifier(foreign_key);
    const sql_key_field = sql.identifier(key_field);
      return orderByAscDesc(
        `CONTRACTS_BY_${foreign_key.toUpperCase()}_CODE_ID`,
        ({queryBuilder}) => sql.fragment`(
        select ${sql_identifier}.code_id
        from app.${sql_foreign_key} as ${sql_identifier}
        where ${sql_identifier}.id = ${queryBuilder.getTableAlias()}.${sql_key_field}
        order by ${sql_identifier}.code_id
      )`
      );
    }
  );
}
