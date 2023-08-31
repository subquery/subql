// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {MetricEventListener} from './event.listener';
import {HealthController} from './health.controller';
import {HealthService} from './health.service';
import {gaugeProviders} from './meta';
import {ReadyController} from './ready.controller';
import {ReadyService} from './ready.service';

export * from './meta.service';

export const metaControllers = [HealthController, ReadyController];

export const metaServices = [MetricEventListener, HealthService, ReadyService, ...gaugeProviders];
