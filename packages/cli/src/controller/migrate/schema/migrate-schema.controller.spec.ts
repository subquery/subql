// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {migrateSchemaFromString} from './migrate-schema.controller';

describe('Subgraph Graphql Schema migration', () => {
  it('correctly migrates a schema', () => {
    // This schema is a mix of schemas from https://github.com/graphprotocol/graph-tooling/tree/main/examples as well as the docs
    const schema = `
    type _Schema_
    @fulltext(
      name: "exampleSearch"
      language: en
      algorithm: rank
      include: [{ entity: "ExampleEntity", fields: [{ name: "optionalString" }, { name: "requiredString" }, { name: "optionalStringList" }] }]
    )

    """
    The Example entity has an example of various fields
    """
    type ExampleEntity @entity {
      """
      The id is required and a unique identifier of the entity
      """
      id: ID!

      optionalBoolean: Boolean
      requiredBoolean: Boolean!
      optionalBooleanList: [Boolean!]
      requiredBooleanList: [Boolean!]!

      optionalString: String
      requiredString: String!
      optionalStringList: [String!]
      requiredStringList: [String!]!

      optionalBytes: Bytes
      requiredBytes: Bytes!
      optionalBytesList: [Bytes!]
      requiredBytesList: [Bytes!]!

      optionalInt: Int
      requiredInt: Int!
      optionalIntList: [Int!]
      requiredIntList: [Int!]!

      optionalInt8: Int8
      requiredInt8: Int8!
      optionalInt8List: [Int8!]
      requiredInt8List: [Int8!]!

      optionalBigInt: BigInt
      requiredBigInt: BigInt!
      optionalBigIntList: [BigInt!]
      requiredBigIntList: [BigInt!]!

      optionalBigDecimal: BigDecimal
      requiredBigDecimal: BigDecimal!
      optionalBigDecimalList: [BigDecimal!]
      requiredBigDecimalList: [BigDecimal!]!

      optionalTimestamp: Timestamp
      requiredTimestamp: Timestamp!
      optionalTimestampList: [Timestamp!]
      requiredTimestampList: [Timestamp!]!

      optionalReference: OtherEntity
      requiredReference: OtherEntity!
      optionalReferenceList: [OtherEntity!]
      requiredReferenceList: [OtherEntity!]!

      derivedEntity: [FooEntity!]! @derivedFrom(field: "example")
      derivedEntity2: [FooEntity!]!
    }

    type OtherEntity @entity(immutable: true, timeseries: true) {
      id: ID!
    }

    type FooEntity @entity {
      id: Bytes!

      example: ExampleEntity!
    }

    type Stats @aggregation(intervals: ["hour", "day"], source: "Block") {
      # The id; it is the id of one of the data points that were aggregated into
      # this bucket, but which one is undefined and should not be relied on
      id: Int8!
      # The timestamp of the bucket is always the timestamp of the beginning of
      # the interval
      timestamp: Timestamp!

      # The aggregates

      # A count of the number of data points that went into this bucket
      count: Int! @aggregate(fn: "count")
      # The max(number) of the data points for this bucket
      max: BigDecimal! @aggregate(fn: "max", arg: "number")
      min: BigDecimal! @aggregate(fn: "min", arg: "number")
      # sum_{i=n}^m i = (m - n + 1) * (n + m) / 2
      sum: BigInt! @aggregate(fn: "sum", arg: "number")
      first: Int! @aggregate(fn: "first", arg: "number")
      last: Int! @aggregate(fn: "last", arg: "number")
      maxGas: BigInt! @aggregate(fn: "max", arg: "gasUsed")
      maxDifficulty: BigInt! @aggregate(fn: "max", arg: "difficulty")
    }
    `;

    const migratedSchema = migrateSchemaFromString(schema);

    console.log('Migrated schema', migratedSchema);

    expect(migratedSchema).toMatchSnapshot();
  });
});
