// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {plainToClass} from 'class-transformer';
import {validate} from 'class-validator';
import {BlockRangeDto} from './blockRange';

describe('BlockRangeDto', () => {
  it('should create a valid BlockRangeDto instance', () => {
    const blockRange = new BlockRangeDto(10, 20);

    expect(blockRange).toBeInstanceOf(BlockRangeDto);
    expect(blockRange.startBlock).toBe(10);
    expect(blockRange.endBlock).toBe(20);
  });

  it('should validate successfully for valid data', async () => {
    const blockRange = plainToClass(BlockRangeDto, {startBlock: 10, endBlock: 20});
    const errors = await validate(blockRange);

    expect(errors.length).toBe(0);
  });

  it('should fail validation if startBlock is not a positive integer', async () => {
    const blockRange = plainToClass(BlockRangeDto, {startBlock: -10, endBlock: 20});
    const errors = await validate(blockRange);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isPositive');
  });

  it('should fail validation if endBlock is not a positive integer', async () => {
    const blockRange = plainToClass(BlockRangeDto, {startBlock: 10, endBlock: -20});
    const errors = await validate(blockRange);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isPositive');
  });

  it('should allow endBlock to be undefined', async () => {
    const blockRange = plainToClass(BlockRangeDto, {startBlock: 10});
    const errors = await validate(blockRange);

    expect(errors.length).toBe(0);
    expect(blockRange.endBlock).toBeUndefined();
  });

  it('should fail validation if startBlock is less than 0', async () => {
    const blockRange = plainToClass(BlockRangeDto, {startBlock: -1, endBlock: 20});
    const errors = await validate(blockRange);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('min');
  });

  it('should fail validation if endBlock is less than 0', async () => {
    const blockRange = plainToClass(BlockRangeDto, {startBlock: 10, endBlock: -1});
    const errors = await validate(blockRange);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('min');
  });
});
