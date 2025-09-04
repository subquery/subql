// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync} from 'fs';
import path from 'path';
import {config as dotenvConfig} from 'dotenv';

export interface EnvConfig {
  [key: string]: string | undefined;
}

/**
 * Load environment variables from .env file in the project directory
 * @param projectDir - The project directory path
 * @returns Object containing environment variables
 */
export function loadEnvConfig(projectDir: string): EnvConfig {
  const envPath = path.join(projectDir, '.env');

  if (!existsSync(envPath)) {
    return {};
  }

  try {
    const envConfig = dotenvConfig({path: envPath});
    return envConfig.parsed || {};
  } catch (error) {
    console.warn(`Warning: Failed to load .env file at ${envPath}:`, error);
    return {};
  }
}

/**
 * Get webpack DefinePlugin definitions for environment variables
 * @param envConfig - Environment configuration object
 * @returns Object with process.env.* definitions for webpack
 */
export function getWebpackEnvDefinitions(envConfig: EnvConfig): Record<string, string> {
  const definitions: Record<string, string> = {};

  Object.keys(envConfig).forEach((key) => {
    if (envConfig[key] !== undefined) {
      definitions[`process.env.${key}`] = JSON.stringify(envConfig[key]);
    }
  });

  return definitions;
}
