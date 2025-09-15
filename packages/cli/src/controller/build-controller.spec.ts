// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, writeFileSync, mkdirSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import {join, resolve} from 'path';
import {getBuildEntries} from './build-controller';

// Mock logger for tests that need it
const mockLogger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('build controller', () => {
  it('picks up test and export files', () => {
    const dir = resolve(__dirname, '../../test/build');

    const entries = getBuildEntries(dir);

    expect(entries['test/mappingHandler.test']).toEqual(resolve(dir, './src/test/mappingHandler.test.ts'));
    expect(entries.chaintypes).toEqual(resolve(dir, './src/chainTypes.ts'));
  });

  describe('Environment variable integration', () => {
    let testDir: string;
    let srcDir: string;
    let distDir: string;
    let envPath: string;

    beforeEach(() => {
      jest.clearAllMocks();

      // Create test directories
      testDir = join(tmpdir(), `subql-build-test-${Date.now()}`);
      srcDir = join(testDir, 'src');
      distDir = join(testDir, 'dist');
      envPath = join(testDir, '.env');

      mkdirSync(srcDir, {recursive: true});
      mkdirSync(distDir, {recursive: true});
    });

    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, {recursive: true, force: true});
      }
    });

    it('should load environment variables from .env file', () => {
      // Create .env file
      const envContent = [
        'DATABASE_URL=postgresql://localhost:5432/test',
        'API_KEY=test-key-123',
        'NODE_ENV=test',
      ].join('\n');
      writeFileSync(envPath, envContent);

      // Import the env utility and test it directly
      const {getWebpackEnvDefinitions, loadEnvConfig} = require('../utils/env');

      const envConfig = loadEnvConfig(testDir);
      expect(envConfig).toEqual({
        DATABASE_URL: 'postgresql://localhost:5432/test',
        API_KEY: 'test-key-123',
        NODE_ENV: 'test',
      });

      const webpackDefinitions = getWebpackEnvDefinitions(envConfig);
      expect(webpackDefinitions).toEqual({
        'process.env.DATABASE_URL': '"postgresql://localhost:5432/test"',
        'process.env.API_KEY': '"test-key-123"',
        'process.env.NODE_ENV': '"test"',
      });
    });

    it('should handle missing .env file gracefully', () => {
      const {loadEnvConfig} = require('../utils/env');

      const envConfig = loadEnvConfig(testDir);
      expect(envConfig).toEqual({});
    });

    it('should handle empty .env file', () => {
      // Create empty .env file
      writeFileSync(envPath, '');

      const {loadEnvConfig} = require('../utils/env');

      const envConfig = loadEnvConfig(testDir);
      expect(envConfig).toEqual({});
    });

    it('should find default entry file', () => {
      writeFileSync(join(srcDir, 'index.ts'), 'export {};');

      const packageJson = {
        name: 'test-project',
        main: 'src/index.ts',
      };
      writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const entries = getBuildEntries(testDir, mockLogger);

      expect(entries).toHaveProperty('index');
      expect(entries.index).toBe(join(testDir, 'src/index.ts'));
    });

    it('should find test files', () => {
      const testDir1 = join(srcDir, 'test');
      const testDir2 = join(srcDir, 'tests');

      mkdirSync(testDir1, {recursive: true});
      mkdirSync(testDir2, {recursive: true});

      writeFileSync(join(srcDir, 'index.ts'), 'export {};');
      writeFileSync(join(testDir1, 'handler.test.ts'), 'export {};');
      writeFileSync(join(testDir2, 'mapping.test.ts'), 'export {};');

      const packageJson = {
        name: 'test-project',
        main: 'src/index.ts',
      };
      writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const entries = getBuildEntries(testDir, mockLogger);

      expect(entries).toHaveProperty('index');
      expect(entries['test/handler.test']).toBeDefined();
      expect(entries['tests/mapping.test']).toBeDefined();
    });
  });
});
