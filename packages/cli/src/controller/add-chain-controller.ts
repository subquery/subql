// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {DEFAULT_MULTICHAIN_MANIFEST, getProjectRootAndManifest, getSchemaPath, loadFromJsonOrYaml} from '@subql/common';
import {MultichainProjectManifest, ProjectManifestV1_0_0} from '@subql/types-core';
import {Scalar, Document, parseDocument, YAMLSeq, YAMLMap} from 'yaml';

const nodeToDockerImage: Record<string, string> = {
  '@subql/node': 'onfinality/subql-node',
  '@subql/node-ethereum': 'onfinality/subql-node-ethereum',
  '@subql/node-cosmos': 'onfinality/subql-node-cosmos',
  '@subql/node-algorand': 'onfinality/subql-node-algorand',
  '@subql/node-near': 'onfinality/subql-node-near',
  '@subql/node-stellar': 'subquerynetwork/subql-node-stellar',
  '@subql/node-concordium': 'subquerynetwork/subql-node-concordium',
};

type DockerComposeDependsOn = {
  condition: string;
};

type DockerComposeEnvironment = {
  [key: string]: string;
};

type DockerComposeHealthcheck = {
  test: Array<string | 'CMD'>;
  interval: string;
  timeout: string;
  retries: number;
};

type DockerComposeService = {
  image?: string;
  depends_on?: Record<string, DockerComposeDependsOn>;
  restart?: string;
  environment?: DockerComposeEnvironment;
  volumes?: string[];
  command?: string[];
  healthcheck?: DockerComposeHealthcheck;
};

export async function addChain(multichain: string, chainManifestPath: string): Promise<void> {
  const multichainManifestPath = determineMultichainManifestPath(multichain);
  const multichainManifest = loadMultichainManifest(multichainManifestPath);
  chainManifestPath = handleChainManifestOrId(chainManifestPath);
  validateAndAddChainManifest(path.parse(multichainManifestPath).dir, chainManifestPath, multichainManifest);
  fs.writeFileSync(multichainManifestPath, multichainManifest.toString());
  await updateDockerCompose(path.parse(multichainManifestPath).dir, chainManifestPath);
}

export function determineMultichainManifestPath(multichain: string): string {
  if (!multichain) {
    throw new Error(`Multichain project path -f not provided`);
  }

  let multichainPath: string;
  if (fs.lstatSync(multichain).isDirectory()) {
    multichainPath = path.resolve(multichain, DEFAULT_MULTICHAIN_MANIFEST);
  } else {
    if (!fs.existsSync(multichain)) {
      throw new Error(`Could not resolve multichain project path: ${multichain}`);
    }
    multichainPath = multichain;
  }

  return multichainPath;
}

export function loadMultichainManifest(multichainManifestPath: string): Document {
  let multichainManifest: Document;

  if (!isMultiChainProject(multichainManifestPath)) {
    throw new Error(`${multichainManifestPath} is an invalid multichain project manifest`);
  }

  if (fs.existsSync(multichainManifestPath)) {
    const content = fs.readFileSync(multichainManifestPath, 'utf8');
    multichainManifest = parseDocument(content);
  } else {
    throw new Error(`Multichain project ${multichainManifestPath} does not exist`);
  }

  return multichainManifest;
}

export function handleChainManifestOrId(chainManifestPath: string): string {
  if (!chainManifestPath) {
    throw new Error('You must provide chain manifest path');
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

  console.log(`Chain manifest: ${chainManifestProject.manifests[0]}`);

  for (const manifestPath of (multichainManifest.get('projects') as YAMLSeq).items.map(
    (item) => (item as Scalar).value as string
  )) {
    const project = getProjectRootAndManifest(path.resolve(projectDir, manifestPath));
    const schemaPath = getSchemaPath(project.root, project.manifests[0]);

    if (schemaPath !== chainManifestSchemaPath) {
      console.error(
        `Error: Schema path in the provided chain manifest is different from the schema path in the existing chain manifest for project: ${project.root}`
      );
      throw new Error('Schema path mismatch error');
    }
  }

  for (const project of (multichainManifest.get('projects') as YAMLSeq<string>).toJSON()) {
    if (path.resolve(projectDir, project as string) === chainManifestPath) {
      console.log(`project ${project} already exists in multichain manifest, skipping addition`);
      return;
    }
  }

  // Add the chain manifest path to multichain manifest
  const relativePath = path.relative(projectDir, chainManifestPath);

  (multichainManifest.get('projects') as YAMLSeq).add(relativePath);
  console.log(`Successfully added chain manifest path: ${relativePath}`);
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
      const commands = service.value.get('command') as YAMLSeq<string>;
      if (!(commands.toJSON() as string[]).includes('--multi-chain')) {
        commands.add('--multi-chain');
      }
      return service.value.toJSON() as DockerComposeService;
    }
  }

  return undefined;
}

async function getDefaultServiceConfiguration(
  chainManifestPath: string,
  serviceName: string
): Promise<DockerComposeService> {
  const manifest = await loadFromJsonOrYaml(chainManifestPath);
  let nodeName: string;
  try {
    nodeName = (manifest as ProjectManifestV1_0_0).runner.node.name;
  } catch (e) {
    throw new Error(`unable to retrieve runner node from manifest: ${e}`);
  }

  const dockerImage = nodeToDockerImage[nodeName];
  if (!dockerImage) {
    throw new Error(`unknown node runner name ${nodeName}`);
  }

  return {
    image: `${dockerImage}:latest`,
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
    command: [`-f=app/${path.basename(chainManifestPath)}`, '--multi-chain'],
    healthcheck: {
      test: ['CMD', 'curl', '-f', `http://${serviceName}:3000/ready`],
      interval: '3s',
      timeout: '5s',
      retries: 10,
    },
  };
}

export async function updateDockerCompose(projectDir: string, chainManifestPath: string): Promise<void> {
  const serviceName = `subquery-node-${path.basename(chainManifestPath, '.yaml')}`;
  const dockerComposePath = path.join(projectDir, 'docker-compose.yml');
  const dockerCompose = loadDockerComposeFile(dockerComposePath);
  if (!dockerCompose) {
    throw new Error(`Docker Compose file does not exist at the specified location: ${dockerComposePath}`);
  }

  console.log(`Updating Docker Compose for chain manifest: ${chainManifestPath}`);

  //check if service already exists
  const services = dockerCompose.get('services');
  if (services && services instanceof YAMLMap) {
    const existingService = services.items.find((item) => {
      const image = item.value.toJSON().image;
      if (!image || !image.startsWith('onfinality/subql-node')) {
        return false;
      }
      const commands: string[] = item.value.toJSON().command;
      return commands?.includes(`-f=app/${path.basename(chainManifestPath)}`);
    });

    if (existingService) {
      console.log(
        `Service for ${path.basename(chainManifestPath)} already exists in Docker Compose, skipping addition`
      );
      return;
    }
  }

  let subqlNodeService = getSubqlNodeService(dockerCompose);
  if (subqlNodeService) {
    // If the service already exists, update its configuration
    subqlNodeService.command = subqlNodeService.command?.filter((cmd) => !cmd.startsWith('-f=')) ?? [];
    subqlNodeService.command.push(`-f=app/${path.basename(chainManifestPath)}`);

    if (subqlNodeService.healthcheck) {
      subqlNodeService.healthcheck.test = ['CMD', 'curl', '-f', `http://${serviceName}:3000/ready`];
    }
  } else {
    // Otherwise, create a new service configuration
    subqlNodeService = await getDefaultServiceConfiguration(chainManifestPath, serviceName);
  }
  console.log(`Created new service configuration: ${serviceName}`);

  (services as YAMLMap).add({key: serviceName, value: subqlNodeService});

  // Save the updated Docker Compose file
  fs.writeFileSync(dockerComposePath, dockerCompose.toString());
  console.log(`Docker Compose file updated successfully at: ${dockerComposePath}`);
}

function isMultiChainProject(content: string): boolean {
  return Array.isArray((loadFromJsonOrYaml(content) as MultichainProjectManifest).projects);
}
