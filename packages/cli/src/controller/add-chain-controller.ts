// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import {ProjectManifestParentV1_0_0, getProjectRootAndManifest, getSchemaPath} from '@subql/common';
import * as yaml from 'js-yaml';

interface DockerComposeType {
  version: string;
  services: {[key: string]: DockerComposeService};
}

type DockerComposeService = {
  image?: string;
  depends_on?: Record<string, any>;
  restart?: string;
  environment?: Record<string, any>;
  volumes?: string[];
  command?: string[];
  healthcheck?: Record<string, any>;
};

export function addChain(multichain: string, chainManifestPath: string, chainId: string, schema: string) {
  const multichainManifestPath = determineMultichainManifestPath(multichain);
  const multichainManifest = loadOrCreateMultichainManifest(multichainManifestPath);
  chainManifestPath = handleChainManifestOrId(chainManifestPath, chainId, schema, multichainManifestPath);
  validateAndAddChainManifest(path.basename(multichainManifestPath), chainManifestPath, multichainManifest);
  fs.writeFileSync(multichainManifestPath, yaml.dump(multichainManifest));
  updateDockerCompose(chainManifestPath);
}

export function determineMultichainManifestPath(multichain: string): string {
  // Default multichain manifest path
  const defaultMultichainManifestPath = path.resolve(process.cwd(), 'multichain-manifest.yaml');

  return multichain ? path.resolve(multichain) : defaultMultichainManifestPath;
}

export function loadOrCreateMultichainManifest(multichainManifestPath: string): ProjectManifestParentV1_0_0 {
  let multichainManifest: ProjectManifestParentV1_0_0;

  if (fs.existsSync(multichainManifestPath)) {
    multichainManifest = yaml.load(fs.readFileSync(multichainManifestPath, 'utf8')) as ProjectManifestParentV1_0_0;
  } else {
    multichainManifest = {
      specVersion: '1.0.0',
      query: {
        name: '@subql/query',
        version: '*',
      },
      projects: [],
    };

    // Save the new multichain manifest
    fs.writeFileSync(multichainManifestPath, yaml.dump(multichainManifest));
  }

  return multichainManifest;
}

export function handleChainManifestOrId(
  chainManifestPath: string,
  chainId: string,
  schema: string,
  multichainManifestPath: string
): string {
  if (!chainManifestPath && !chainId) {
    throw new Error('You must provide either a chain manifest path or a chain ID.');
  }

  // If a chain ID is provided, generate a chain manifest for it.
  if (chainId) {
    if (!schema && !fs.existsSync(multichainManifestPath)) {
      throw new Error('You must provide a schema path if no multichain manifest is found.');
    }

    // Fetch schema from existing manifest if not provided via CLI args
    if (!schema) {
      const multichainManifest = yaml.load(
        fs.readFileSync(multichainManifestPath, 'utf8')
      ) as ProjectManifestParentV1_0_0;
      const project = getProjectRootAndManifest(multichainManifest.projects[0]);
      schema = getSchemaPath(project.root, project.manifests[0]);
    }

    chainManifestPath = generateChainManifest(chainId, schema);
  }

  // Check if the provided chain manifest path exists
  if (!fs.existsSync(chainManifestPath)) {
    throw new Error(`Chain manifest file does not exist at the specified location: ${chainManifestPath}`);
  }

  return chainManifestPath;
}

export function validateAndAddChainManifest(
  projectDir: string,
  chainManifestPath: string,
  multichainManifest: ProjectManifestParentV1_0_0
): void {
  // Validate schema paths
  const chainManifestProject = getProjectRootAndManifest(path.resolve(projectDir, chainManifestPath));
  const chainManifestSchemaPath = getSchemaPath(chainManifestProject.root, chainManifestProject.manifests[0]);

  for (const manifestPath of multichainManifest.projects) {
    const project = getProjectRootAndManifest(path.resolve(projectDir, manifestPath));
    const schemaPath = getSchemaPath(project.root, project.manifests[0]);

    if (schemaPath !== chainManifestSchemaPath) {
      throw new Error(
        `Schema path in the provided chain manifest is different from the schema path in the existing chain manifest: ${manifestPath}`
      );
    }
  }

  // Add the chain manifest path to multichain manifest
  multichainManifest.projects.push(chainManifestPath);
}

export function loadDockerComposeFile(dockerComposePath: string): DockerComposeType | undefined {
  if (fs.existsSync(dockerComposePath)) {
    return yaml.load(fs.readFileSync(dockerComposePath, 'utf8')) as DockerComposeType;
  }
}

function getSubqlNodeService(dockerCompose: DockerComposeType): DockerComposeService | undefined {
  return Object.values(dockerCompose.services).find((service) => service.image?.startsWith('onfinality/subql-node'));
}

function getDefaultServiceConfiguration(chainManifestPath: string, serviceName: string): DockerComposeService {
  return {
    image: 'onfinality/subql-node:latest',
    depends_on: {
      postgres: {
        condition: 'service_healthy',
      },
    },
    restart: 'always',
    environment: {
      DB_USER: 'postgres',
      DB_PASS: 'postgres',
      DB_DATABASE: 'postgres',
      DB_HOST: 'postgres',
      DB_PORT: '5432',
    },
    volumes: ['./:/app'],
    command: [`-f=app/${path.basename(chainManifestPath)}`, '--multi-chain', '--disable-historical'],
    healthcheck: {
      test: ['CMD', 'curl', '-f', `http://${serviceName}:3000/ready`],
      interval: '3s',
      timeout: '5s',
      retries: 10,
    },
  };
}

function createNewServiceConfiguration(
  defaultServiceConfiguration: DockerComposeService,
  chainManifestPath: string,
  serviceName: string
): any {
  const newServiceConfiguration = JSON.parse(JSON.stringify(defaultServiceConfiguration));
  newServiceConfiguration.command[0] = `-f=app/${path.basename(chainManifestPath)}`;
  newServiceConfiguration.healthcheck.test = ['CMD', 'curl', '-f', `http://${serviceName}:3000/ready`];
  return newServiceConfiguration;
}

export function updateDockerCompose(chainManifestPath: string): void {
  const serviceName = `subquery-node-${path.basename(chainManifestPath, '.yaml')}`;
  const dockerComposePath = path.resolve(process.cwd(), 'docker-compose.yml');
  const dockerCompose: DockerComposeType = loadDockerComposeFile(dockerComposePath) || {version: '3', services: {}};
  const defaultServiceConfiguration =
    getSubqlNodeService(dockerCompose) || getDefaultServiceConfiguration(chainManifestPath, serviceName);

  // If service with the given name already exists, do not add it again
  if (dockerCompose.services[serviceName]) {
    console.log(`Service ${serviceName} already exists, skipping addition.`);
    return;
  }

  // Add the new service to the docker compose services
  dockerCompose.services[serviceName] = createNewServiceConfiguration(
    defaultServiceConfiguration,
    chainManifestPath,
    serviceName
  );

  // Update docker-compose file
  fs.writeFileSync(dockerComposePath, yaml.dump(dockerCompose));
}

function generateChainManifest(chainId: string, schema: string): string {
  // TODO: Implement the actual logic for generating a chain manifest based on a chain ID.
  throw new Error('generateChainManifest() is not implemented yet.');
}
