// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Type} from 'class-transformer';
import {
  IsInt,
  IsPositive,
  Min,
  IsOptional,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsGreaterThan(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isGreaterThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === undefined || value > relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be greater than ${relatedPropertyName}`;
        },
      },
    });
  };
}

export interface BlockRangeDtoInterface {
  startBlock: number;
  endBlock?: number;
}

export class BlockRangeDto implements BlockRangeDtoInterface {
  constructor(startBlock: number, endBlock?: number) {
    this.startBlock = startBlock;
    this.endBlock = endBlock;
  }

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(0)
  startBlock: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(0)
  @IsOptional()
  @IsGreaterThan('startBlock')
  endBlock: number | undefined;
}
