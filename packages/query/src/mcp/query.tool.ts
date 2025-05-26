// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Inject, Injectable} from '@nestjs/common';
import {Tool, Context} from '@rekog/mcp-nest';
import type {Request} from 'express';
import {z} from 'zod';
import {ChatService} from '../llm/chat.service';

@Injectable()
export class QueryTool {
  constructor(@Inject(ChatService) private readonly chatSevice: ChatService) {}

  @Tool({
    name: 'natural-query-subquery',
    description: 'Make a natural language query to the SubQuery Project',
    parameters: z.object({
      input: z.array(z.string({description: 'The messages to be input to the chat service'})),
    }),
  })
  async naturalQuery(
    {input}: {input: string[]},
    context: Context,
    request: Request
  ): Promise<{content: {type: 'text'; text: string}[]}> {
    const result = await this.chatSevice.prompt(input);

    return {
      content: [{type: 'text', text: result}],
    };
  }
}
