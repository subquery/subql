// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { validDbSchemaName } from './configure.module';

describe('Configure', () => {
  it('validDbSchemaName - works', () => {
    expect(validDbSchemaName('subquery_1')).toBeTruthy();
  });
  it('validDbSchemaName - works not alphanumeric', () => {
    expect(validDbSchemaName('subquery_-/1')).toBeTruthy();
  });
  it('validDbSchemaName - long', () => {
    expect(validDbSchemaName('a'.repeat(64))).toBeFalsy();
  });
  it('validDbSchemaName - invalid prefix', () => {
    expect(validDbSchemaName('pg_whatever')).toBeFalsy();
  });
  it('validDbSchemaName - invalid tokens', () => {
    expect(validDbSchemaName('he$$*')).toBeFalsy();
  });
  it('validDbSchemaName - empty', () => {
    expect(validDbSchemaName('')).toBeFalsy();
  });
});
