// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {AdminController, AdminListener} from './admin.controller';

export const adminControllers = [AdminController];
// include for other service
export const adminServices = [AdminListener];
export * from './blockRange';
