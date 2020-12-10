import { GraphQLObjectType, GraphQLOutputType, isNonNullType } from 'graphql';
import { ModelAttributes } from 'sequelize';

const SEQUELIZE_TYPE_MAPPING = {
  ID: 'text',
  Int: 'integer',
  BigInt: 'numeric',
  String: 'text',
  Date: 'timestamp',
  BigDecimal: 'numeric',
  Boolean: 'boolean',
  Bytes: 'bytea',
};

export function objectTypeToModelAttributes(
  objectType: GraphQLObjectType,
): ModelAttributes<any> {
  const fields = objectType.getFields();
  return Object.entries(fields).reduce((acc, [k, v]) => {
    let type: GraphQLOutputType = v.type;
    let allowNull = true;
    if (isNonNullType(type)) {
      type = type.ofType;
      allowNull = false;
    }
    acc[k] = {
      type: SEQUELIZE_TYPE_MAPPING[type.toString()],
      allowNull,
      primaryKey: type.toString() === 'ID',
    };
    return acc;
  }, {} as ModelAttributes<any>);
}
