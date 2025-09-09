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
export function loadProjectEnvConfig(projectDir: string): EnvConfig {
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
 * Create a process.env object for sandbox injection
 * @param envConfig - Environment configuration object
 * @returns Object with environment variables for sandbox
 */
export function createSandboxProcessEnv(envConfig: EnvConfig): Record<string, string> {
  const processEnv: Record<string, string> = {};

  Object.keys(envConfig).forEach((key) => {
    const value = envConfig[key];
    if (value !== undefined) {
      processEnv[key] = value;
    }
  });

  return processEnv;
}
