// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {loadProjectEnvConfig, createSandboxProcessEnv} from './env';

describe('Node Core Environment Utils', () => {
  let testDir: string;
  let envPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = join(tmpdir(), `subql-node-env-test-${Date.now()}`);
    mkdirSync(testDir, {recursive: true});
    envPath = join(testDir, '.env');
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, {recursive: true, force: true});
    }
  });

  describe('loadProjectEnvConfig', () => {
    it('should return empty object when no .env file exists', () => {
      const config = loadProjectEnvConfig(testDir);
      expect(config).toEqual({});
    });

    it('should load environment variables from .env file', () => {
      const envContent = [
        'NODE_ENV=development',
        'DATABASE_HOST=localhost',
        'DATABASE_PORT=5432',
        'INDEXER_WORKERS=4',
        'LOG_LEVEL=debug',
      ].join('\n');

      writeFileSync(envPath, envContent);

      const config = loadProjectEnvConfig(testDir);
      expect(config).toEqual({
        NODE_ENV: 'development',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        INDEXER_WORKERS: '4',
        LOG_LEVEL: 'debug',
      });
    });

    it('should handle parsing errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create an invalid .env file (binary content)
      writeFileSync(envPath, Buffer.from([0x00, 0x01, 0x02, 0x03]));

      const config = loadProjectEnvConfig(testDir);

      expect(config).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('createSandboxProcessEnv', () => {
    it('should create process.env compatible object', () => {
      const envConfig = {
        NODE_ENV: 'development',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        INDEXER_WORKERS: '4',
      };

      const processEnv = createSandboxProcessEnv(envConfig);

      expect(processEnv).toEqual({
        NODE_ENV: 'development',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        INDEXER_WORKERS: '4',
      });
    });

    it('should filter out undefined values', () => {
      const envConfig = {
        DEFINED_VAR: 'value',
        UNDEFINED_VAR: undefined,
        ANOTHER_VAR: 'another-value',
      };

      const processEnv = createSandboxProcessEnv(envConfig);

      expect(processEnv).toEqual({
        DEFINED_VAR: 'value',
        ANOTHER_VAR: 'another-value',
      });
      expect(processEnv.UNDEFINED_VAR).toBeUndefined();
    });

    it('should handle empty string values', () => {
      const envConfig = {
        EMPTY_VAR: '',
        ZERO_VAR: '0',
      };

      const processEnv = createSandboxProcessEnv(envConfig);

      expect(processEnv).toEqual({
        EMPTY_VAR: '',
        ZERO_VAR: '0',
      });
    });

    it('should handle empty config', () => {
      const envConfig = {};

      const processEnv = createSandboxProcessEnv(envConfig);

      expect(processEnv).toEqual({});
    });
  });

  describe('Integration test', () => {
    it('should work end-to-end from file to sandbox env', () => {
      const envContent = [
        'NODE_ENV=production',
        'DATABASE_URL=postgresql://prod-server:5432/subql',
        'REDIS_URL=redis://prod-redis:6379',
        'MAX_CONNECTIONS=20',
        'ENABLE_CACHE=true',
      ].join('\n');

      writeFileSync(envPath, envContent);

      const config = loadProjectEnvConfig(testDir);
      const processEnv = createSandboxProcessEnv(config);

      expect(processEnv).toEqual({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod-server:5432/subql',
        REDIS_URL: 'redis://prod-redis:6379',
        MAX_CONNECTIONS: '20',
        ENABLE_CACHE: 'true',
      });
    });
  });
});
