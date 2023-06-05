// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import {getProjectRootAndManifest, getSchemaPath} from '@subql/common';
import {Scalar, Document, parseDocument, YAMLSeq, YAMLMap} from 'yaml';

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
  validateAndAddChainManifest(path.parse(multichainManifestPath).dir, chainManifestPath, multichainManifest);
  fs.writeFileSync(multichainManifestPath, multichainManifest.toString());
  updateDockerCompose(path.parse(multichainManifestPath).dir, chainManifestPath);
}

export function determineMultichainManifestPath(multichain: string): string {
  if (!multichain) {
    throw new Error(`Multichain project path -m not provided`);
  }

  let multichainPath: string;
  if (fs.lstatSync(multichain).isDirectory()) {
    multichainPath = path.resolve(multichain, 'multichain-manifest.yaml');
  } else {
    if (!fs.existsSync(multichain)) {
      throw new Error(`Could not resolve multichain project path: ${multichain}`);
    }
    multichainPath = multichain;
  }

  return multichainPath;
}

export function loadOrCreateMultichainManifest(multichainManifestPath: string): Document {
  let multichainManifest: Document;

  if (fs.existsSync(multichainManifestPath)) {
    const content = fs.readFileSync(multichainManifestPath, 'utf8');
    multichainManifest = parseDocument(content);
  } else {
    multichainManifest = new Document({
      specVersion: '1.0.0',
      query: {
        name: '@subql/query',
        version: '*',
      },
      projects: [],
    });

    // Save the new multichain manifest
    fs.writeFileSync(multichainManifestPath, multichainManifest.toString());
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
      const multichainManifestContent = fs.readFileSync(multichainManifestPath, 'utf8');
      const multichainManifest = parseDocument(multichainManifestContent);
      const project = getProjectRootAndManifest(multichainManifest.get('projects') as string[][0]);
      schema = getSchemaPath(project.root, project.manifests[0]);
    }

    chainManifestPath = generateChainManifest(chainId, schema);
  }

  // Check if the provided chain manifest path exists
  if (!fs.existsSync(chainManifestPath)) {
    throw new Error(`Chain manifest file does not exist at the specified location: ${chainManifestPath}`);
  }

  return path.resolve(chainManifestPath);
}

export function validateAndAddChainManifest(
  projectDir: string,
  chainManifestPath: string,
  multichainManifest: Document
): void {
  // Validate schema paths
  const chainManifestProject = getProjectRootAndManifest(path.resolve(projectDir, chainManifestPath));
  const chainManifestSchemaPath = getSchemaPath(chainManifestProject.root, chainManifestProject.manifests[0]);

  for (const manifestPath of (multichainManifest.get('projects') as YAMLSeq).items.map(
    (item) => (item as Scalar).value as string
  )) {
    const project = getProjectRootAndManifest(path.resolve(projectDir, manifestPath));
    const schemaPath = getSchemaPath(project.root, project.manifests[0]);

    if (schemaPath !== chainManifestSchemaPath) {
      throw new Error(
        `Schema path in the provided chain manifest is different from the schema path in the existing chain manifest: ${manifestPath}`
      );
    }
  }

  // Add the chain manifest path to multichain manifest
  (multichainManifest.get('projects') as YAMLSeq).add(path.relative(projectDir, chainManifestPath));
}

export function loadDockerComposeFile(dockerComposePath: string): Document | undefined {
  if (fs.existsSync(dockerComposePath)) {
    const content = fs.readFileSync(dockerComposePath, 'utf8');
    return parseDocument(content);
  }
}

function getSubqlNodeService(dockerCompose: Document): DockerComposeService | undefined {
  const services = dockerCompose.get('services');
  if (services && services instanceof YAMLMap) {
    const service = services.items.find((item) => {
      const image = item.value.get('image') as string;
      return image?.startsWith('onfinality/subql-node');
    });

    if (service && service.value instanceof YAMLMap) {
      return service.value.toJSON() as DockerComposeService;
    }
  }

  return undefined;
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

export function updateDockerCompose(projectDir: string, chainManifestPath: string): void {
  const serviceName = `subquery-node-${path.basename(chainManifestPath, '.yaml')}`;
  const dockerComposePath = path.join(projectDir, 'docker-compose.yml');
  const dockerCompose = loadDockerComposeFile(dockerComposePath);
  if (!dockerCompose) {
    throw new Error(`Docker Compose file does not exist at the specified location: ${dockerComposePath}`);
  }

  const services = dockerCompose.get('services');
  if (services && services instanceof YAMLMap) {
    const existingService = services.items.find((item) => item.key?.value === serviceName);
    if (existingService) {
      console.log(`service ${serviceName} already exists, skipping addition`);
      return;
    }
  }

  let subqlNodeService = getSubqlNodeService(dockerCompose);
  if (subqlNodeService) {
    // If the service already exists, update its configuration
    subqlNodeService.command[0] = `-f=app/${path.basename(chainManifestPath)}`;
    subqlNodeService.healthcheck.test = ['CMD', 'curl', '-f', `http://${serviceName}:3000/ready`];
  } else {
    // Otherwise, create a new service configuration
    subqlNodeService = getDefaultServiceConfiguration(chainManifestPath, serviceName);
  }
  (services as YAMLMap).add({key: serviceName, value: subqlNodeService});
  // Save the updated Docker Compose file
  fs.writeFileSync(dockerComposePath, dockerCompose.toString());
}

function generateChainManifest(chainId: string, schema: string): string {
  // TODO: Implement the actual logic for generating a chain manifest based on a chain ID.
  throw new Error('generateChainManifest() is not implemented yet.');
}
