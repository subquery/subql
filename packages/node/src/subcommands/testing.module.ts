// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';

@Module({
  providers: [],
  controllers: [],
})
export class TestingFeatureModule {}

@Module({
  imports: [TestingFeatureModule],
  controllers: [],
})
export class TestingModule {}
