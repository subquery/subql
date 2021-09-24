// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface ProjectSpec {
  name: string;
  repository?: string;
  network: string;
  author: string;
  description?: string;
  version: string;
  license: string;
}
