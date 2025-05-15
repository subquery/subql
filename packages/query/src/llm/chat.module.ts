// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { BaseMessage, SystemMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SqlToolkit } from 'langchain/agents/toolkits/sql';
import { SqlDatabase } from 'langchain/sql_db';
import { DataSource } from 'typeorm';
import { Config } from '../configure';
import { getLogger } from '../utils/logger';
import { getYargsOption } from '../yargs';
import { createLLM } from './createLLM';

const { argv } = getYargsOption();
const logger = getLogger('chat-module');

@Module({
  providers: [],
})
export class ChatModule implements OnModuleInit {
  agent?: ReturnType<typeof createReactAgent>;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly dataSource: DataSource,
    private readonly config: Config
  ) {}

  onModuleInit(): void {
    if (!this.httpAdapterHost) {
      return;
    }
    try {
      this.createServer();
    } catch (e: any) {
      throw new Error(`create apollo server failed, ${e.message}`);
    }
  }

  private async initializeAgent() {
    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: this.dataSource,
    });

    const llm = createLLM();

    const toolkit = new SqlToolkit(db, llm);

    this.agent = createReactAgent({
      llm,
      tools: toolkit.getTools(),
      prompt: new SystemMessage(
        `You are an AI assistant that helps users query their PostgreSQL database using natural language.

When generating SQL queries:
* Always use the correct schema (${this.config.get<string>('name') || 'public'})
* Only query tables that are available to you
* Never mutate database, including add/update/remove record from any table, run any DLL statements, only read.
* Always limit the query with maximum 100 rows
* Format your responses in a clear, readable way
* If you're unsure about the schema or table structure, ask for clarification
* If a table has column _block_range, it is a versioned table, You MUST always add \`_block_range @> 9223372036854775807\` to the where clause for all queries
* If it is a join query, \`_block_range @> 9223372036854775807\` is needed for all tables in the join`
      ),
    });
  }

  private createServer() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();

    if (argv.chat) {
      app.post('/v1/chat/completions', async (req, res) => {
        try {
          if (!this.agent) {
            await this.initializeAgent();
          }

          const { messages, stream = false } = req.body;

          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
              error: {
                message: 'messages is required and must be a non-empty array',
                type: 'invalid_request_error',
                code: 'invalid_messages',
              },
            });
          }

          // Convert OpenAI format messages to LangChain format
          const lastMessage = messages[messages.length - 1];
          const question = lastMessage.content;

          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const result = await this.agent!.stream({ messages: [['user', question]] }, { streamMode: 'values' });

          let fullResponse = '';
          for await (const event of result) {
            const lastMsg: BaseMessage = event.messages[event.messages.length - 1];
            if (lastMsg.content) {
              fullResponse = lastMsg.content as string;
              logger.info(`Streaming response: ${JSON.stringify(lastMsg)}`);
              if (argv['llm-debug'] && stream) {
                // todo: send them as thinking details
                res.write(
                  `data: ${JSON.stringify({
                    id: `chatcmpl-${Date.now()}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: process.env.OPENAI_MODEL,
                    choices: [
                      {
                        index: 0,
                        delta: { content: lastMsg.content },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`
                );
              }
            }
          }

          // Send final message
          if (stream) {
            res.write(
              `data: ${JSON.stringify({
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: process.env.OPENAI_MODEL,
                choices: [
                  {
                    index: 0,
                    message: { role: 'assistant', content: fullResponse },
                    finish_reason: 'stop',
                  },
                ],
              })}\n\n`
            );
          } else {
            res.write(
              `data: ${JSON.stringify({
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: process.env.OPENAI_MODEL,
                choices: [
                  {
                    index: 0,
                    message: { role: 'assistant', content: fullResponse },
                    finish_reason: 'stop',
                  },
                ],
              })}\n\n`
            );
          }
          res.end();
        } catch (error) {
          logger.error('Error processing request:', error);
          res.status(500).json({
            error: {
              message: (error as any).message,
              type: 'internal_server_error',
            },
          });
        }
      });
    } else {
      app.post('/v1/chat/completions', (req, res) => {
        res.status(404).json({
          error: {
            message: 'Chat completions API is not enabled',
            type: 'invalid_request_error',
            code: 'chat_api_not_enabled',
          },
        });
      });
    }
  }
}
