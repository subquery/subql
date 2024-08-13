import {subqlTest} from '@subql/testing';

// See https://academy.subquery.network/build/testing.html

subqlTest(
  'handleTransfer test', // Test name
  191, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  'handleEvent' // handler name
);
