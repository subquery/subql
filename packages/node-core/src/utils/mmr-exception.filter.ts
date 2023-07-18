// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus} from '@nestjs/common';

@Catch()
export class MmrExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status: number;
    let errorMessage: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorMessage = exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorMessage = (exception as Error).message;
    }

    response.status(status).json({
      statusCode: status,
      error: errorMessage,
    });
  }
}
