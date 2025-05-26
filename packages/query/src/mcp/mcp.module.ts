// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {McpModule} from '@rekog/mcp-nest';
import {ChatModule} from '../llm/chat.module';
import {QueryTool} from './query.tool';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'subquery-mcp-server',
      version: '1.0.0',
    }),
    ChatModule,
  ],
  providers: [QueryTool],
})
export class MCPModule {}
