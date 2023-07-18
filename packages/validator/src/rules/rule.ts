// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Context} from '../context';
import {RequireBuildScript} from './require-build-script';
import {RequireCliDep} from './require-cli-dep';
import {RequireCodegenScript} from './require-codegen-script';
import {RequireCustomDsValidation} from './require-custom-ds-validation';
import RequireValidChainTypes from './require-valid-chaintypes';
import {RequireValidManifest} from './require-valid-manifest';
import {RequireValidRunner} from './require-valid-runner';

export enum RuleType {
  PackageJSON = 'packageJSON',
  Schema = 'schema',
}

export interface Rule {
  type: RuleType;
  name: string;
  description: string;

  validate(ctx: Context): boolean | Promise<boolean>;
}

export const deploymentRules: Rule[] = [
  new RequireValidManifest(),
  new RequireValidChainTypes(),
  new RequireCustomDsValidation(),
  new RequireValidRunner(),
];

export const commonRules: Rule[] = [
  new RequireBuildScript(),
  new RequireCodegenScript(),
  new RequireCliDep(),
  ...deploymentRules,
];
