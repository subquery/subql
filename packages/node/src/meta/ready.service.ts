// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { ProjectService } from '../indexer/project.service';

@Injectable()
export class ReadyService {
  constructor(private projectService: ProjectService) {}

  get ready(): boolean {
    return !!this.projectService.schema;
  }
}
