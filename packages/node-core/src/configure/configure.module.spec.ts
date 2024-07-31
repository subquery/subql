// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {validDbSchemaName, yargsToIConfig} from './configure.module';

describe('Configure', () => {
  describe('validateDbSchemaName', () => {
    it('works', () => {
      expect(validDbSchemaName('subquery_1')).toBeTruthy();
    });
    it('works not alphanumeric', () => {
      expect(validDbSchemaName('subquery_-/1')).toBeTruthy();
    });
    it('long', () => {
      expect(validDbSchemaName('a'.repeat(64))).toBeFalsy();
    });
    it('invalid prefix', () => {
      expect(validDbSchemaName('pg_whatever')).toBeFalsy();
    });
    it('invalid tokens', () => {
      expect(validDbSchemaName('he$$*')).toBeFalsy();
    });
    it('empty', () => {
      expect(validDbSchemaName('')).toBeFalsy();
    });
  });

  describe('network endpoint options', () => {
    it('should work without network-endpoint-config options', () => {
      const {networkEndpoint} = yargsToIConfig({
        'network-endpoint': 'https://example.com',
      });

      expect(networkEndpoint).toEqual({['https://example.com']: {}});
    });

    it('should work without network-endpoint-config options (array)', () => {
      const {networkEndpoint} = yargsToIConfig({
        'network-endpoint': ['https://example.com', 'https://foo.bar'],
      });

      expect(networkEndpoint).toEqual({
        ['https://example.com']: {},
        ['https://foo.bar']: {},
      });
    });

    it('should work with network-endpoint-config options', () => {
      const option = {headers: {'api-key': '<your-api-key>'}};
      const {networkEndpoint} = yargsToIConfig({
        'network-endpoint': 'https://example.com',
        'network-endpoint-config': JSON.stringify(option),
      });

      expect(networkEndpoint).toEqual({['https://example.com']: option});
    });

    it('should work with network-endpoint-config options (array)', () => {
      const option = {headers: {'api-key': '<your-api-key>'}};
      const {networkEndpoint} = yargsToIConfig({
        'network-endpoint': ['https://example.com', 'https://foo.bar'],
        'network-endpoint-config': [JSON.stringify(option), JSON.stringify(option)],
      });

      expect(networkEndpoint).toEqual({
        ['https://example.com']: option,
        ['https://foo.bar']: option,
      });
    });

    it('should work with network-endpoint-config options (mixed-arrays)', () => {
      const option = {headers: {'api-key': '<your-api-key>'}};
      const {networkEndpoint} = yargsToIConfig({
        'network-endpoint': ['https://example.com', 'https://foo.bar'],
        'network-endpoint-config': [JSON.stringify(option)],
      });

      expect(networkEndpoint).toEqual({
        ['https://example.com']: option,
        ['https://foo.bar']: {},
      });
    });

    it('should work without primary-network-endpoint-config options', () => {
      const {primaryNetworkEndpoint} = yargsToIConfig({
        'primary-network-endpoint': 'https://example.com',
      });

      expect(primaryNetworkEndpoint).toEqual(['https://example.com', {}]);
    });

    it('should work with primary-network-endpoint-config options', () => {
      const option = {headers: {'api-key': '<your-api-key>'}};
      const {primaryNetworkEndpoint} = yargsToIConfig({
        'primary-network-endpoint': 'https://example.com',
        'primary-network-endpoint-config': JSON.stringify(option),
      });

      expect(primaryNetworkEndpoint).toEqual(['https://example.com', option]);
    });

    it('doesnt add config flags to IConfig', () => {
      const option = {headers: {'api-key': '<your-api-key>'}};
      const config = yargsToIConfig({
        'network-endpoint': ['https://example.com', 'https://foo.bar'],
        'network-endpoint-config': [JSON.stringify(option), JSON.stringify(option)],
        'primary-network-endpoint': 'https://example.com',
        'primary-network-endpoint-config': JSON.stringify(option),
      });

      expect((config as any).networkEndpointConfig).toBe(undefined);
      expect((config as any).primaryNetworkEndpointConfig).toBe(undefined);
    });
  });
});
