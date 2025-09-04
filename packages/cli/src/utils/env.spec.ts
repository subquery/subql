// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {loadEnvConfig, getWebpackEnvDefinitions} from './env';

describe('Environment Configuration Utils', () => {
  let testDir: string;
  let envPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = join(tmpdir(), `subql-env-test-${Date.now()}`);
    mkdirSync(testDir, {recursive: true});
    envPath = join(testDir, '.env');
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, {recursive: true, force: true});
    }
  });

  describe('loadEnvConfig', () => {
    it('should return empty object when no .env file exists', () => {
      const config = loadEnvConfig(testDir);
      expect(config).toEqual({});
    });

    it('should load environment variables from .env file', () => {
      const envContent = [
        'DATABASE_URL=postgresql://localhost:5432/subql',
        'API_KEY=test-api-key',
        'DEBUG=true',
        'PORT=3000',
        '# This is a comment',
        'EMPTY_VALUE=',
        'QUOTED_VALUE="quoted string"',
      ].join('\n');

      writeFileSync(envPath, envContent);

      const config = loadEnvConfig(testDir);
      expect(config).toEqual({
        DATABASE_URL: 'postgresql://localhost:5432/subql',
        API_KEY: 'test-api-key',
        DEBUG: 'true',
        PORT: '3000',
        EMPTY_VALUE: '',
        QUOTED_VALUE: 'quoted string',
      });
    });

    it('should handle malformed .env file gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      // Create file with invalid syntax that will cause dotenv to throw
      writeFileSync(envPath, 'INVALID LINE WITHOUT EQUALS');

      const config = loadEnvConfig(testDir);

      // Should return empty config on error
      expect(config).toEqual({});

      consoleSpy.mockRestore();
    });

    it('should support variables with special characters', () => {
      const envContent = [
        'SPECIAL_CHARS=value_with-dash.and_underscore',
        'URL_WITH_PARAMS=https://api.example.com?param=value&other=123',
        'PATH_VALUE=/path/to/file',
      ].join('\n');

      writeFileSync(envPath, envContent);

      const config = loadEnvConfig(testDir);
      expect(config.SPECIAL_CHARS).toBe('value_with-dash.and_underscore');
      expect(config.URL_WITH_PARAMS).toBe('https://api.example.com?param=value&other=123');
      expect(config.PATH_VALUE).toBe('/path/to/file');
    });
  });

  describe('getWebpackEnvDefinitions', () => {
    it('should convert env config to webpack DefinePlugin definitions', () => {
      const envConfig = {
        DATABASE_URL: 'postgresql://localhost:5432/subql',
        API_KEY: 'test-api-key',
        DEBUG: 'true',
        PORT: '3000',
      };

      const definitions = getWebpackEnvDefinitions(envConfig);

      expect(definitions).toEqual({
        'process.env.DATABASE_URL': '"postgresql://localhost:5432/subql"',
        'process.env.API_KEY': '"test-api-key"',
        'process.env.DEBUG': '"true"',
        'process.env.PORT': '"3000"',
      });
    });

    it('should skip undefined values', () => {
      const envConfig = {
        DEFINED_VAR: 'value',
        UNDEFINED_VAR: undefined,
      };

      const definitions = getWebpackEnvDefinitions(envConfig);

      expect(definitions).toEqual({
        'process.env.DEFINED_VAR': '"value"',
      });
      expect(definitions['process.env.UNDEFINED_VAR']).toBeUndefined();
    });

    it('should handle empty values', () => {
      const envConfig = {
        EMPTY_STRING: '',
        ZERO_VALUE: '0',
      };

      const definitions = getWebpackEnvDefinitions(envConfig);

      expect(definitions).toEqual({
        'process.env.EMPTY_STRING': '""',
        'process.env.ZERO_VALUE': '"0"',
      });
    });

    it('should properly escape special characters for JSON', () => {
      const envConfig = {
        QUOTES: 'value with "quotes"',
        BACKSLASHES: 'path\\to\\file',
        NEWLINES: 'line1\nline2',
      };

      const definitions = getWebpackEnvDefinitions(envConfig);

      expect(definitions['process.env.QUOTES']).toBe('"value with \\"quotes\\""');
      expect(definitions['process.env.BACKSLASHES']).toBe('"path\\\\to\\\\file"');
      expect(definitions['process.env.NEWLINES']).toBe('"line1\\nline2"');
    });
  });

  describe('Integration tests', () => {
    it('should work end-to-end from file to webpack definitions', () => {
      const envContent = [
        'DATABASE_URL=postgresql://localhost:5432/subql',
        'API_KEY=secret-key-123',
        'DEBUG=true',
      ].join('\n');

      writeFileSync(envPath, envContent);

      const config = loadEnvConfig(testDir);
      const definitions = getWebpackEnvDefinitions(config);

      expect(definitions).toEqual({
        'process.env.DATABASE_URL': '"postgresql://localhost:5432/subql"',
        'process.env.API_KEY': '"secret-key-123"',
        'process.env.DEBUG': '"true"',
      });
    });
  });
});
