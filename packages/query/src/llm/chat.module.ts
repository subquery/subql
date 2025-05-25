// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseMessage} from '@langchain/core/messages';
import {createReactAgent} from '@langchain/langgraph/prebuilt';
import {Module, OnModuleInit} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {getLogger} from '../utils/logger';
import {getYargsOption} from '../yargs';
import {ChatService} from './chat.service';

const {argv} = getYargsOption();
const logger = getLogger('chat-module');

type Agent = ReturnType<typeof createReactAgent>;

@Module({
  providers: [ChatService],

  exports: [ChatService],
})
export class ChatModule implements OnModuleInit {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly chatService: ChatService
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

  private createServer() {
    const app = this.httpAdapterHost.httpAdapter.getInstance();

    if (!argv.chat) {
      app.post('/v1/chat/completions', (req, res) => {
        res.status(404).json({
          error: {
            message: 'Chat completions API is not enabled',
            type: 'invalid_request_error',
            code: 'chat_api_not_enabled',
          },
        });
      });

      return;
    }

    // Needed for some web UIs. eg. ghcr.io/open-webui/open-webui
    app.get('/v1/models', (req, res) => {
      return res.json({
        object: 'list',
        data: [
          {
            id: 'subql-ai',
            object: 'model',
            created: new Date().getTime(),
            owner: 'SubQuery',
          },
        ],
      });
    });

    app.post('/v1/chat/completions', async (req, res) => {
      try {
        const {messages, stream = false} = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return res.status(400).json({
            error: {
              message: 'messages is required and must be a non-empty array',
              type: 'invalid_request_error',
              code: 'invalid_messages',
            },
          });
        }

        const sendMessage = (object: string, choices: any[]) => {
          return res.write(
            `data: ${JSON.stringify({
              id: `chatcmpl-${Date.now()}`,
              object,
              created: Math.floor(Date.now() / 1000),
              model: process.env.OPENAI_MODEL,
              choices,
            })}\n\n`
          );
        };

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const agent = await this.chatService.getAgent();
        const result = await agent.stream({messages}, {streamMode: 'values'});

        let fullResponse = '';
        let first = true;
        let thinking = false;
        for await (const event of result) {
          const lastMsg: BaseMessage = event.messages[event.messages.length - 1];
          fullResponse = lastMsg.content as string;
          if (lastMsg.content && lastMsg.getType() === 'tool') {
            if (argv['chat-debug'] && stream && lastMsg.response_metadata?.finish_reason !== 'stop') {
              if (first) {
                sendMessage('chat.completion.chunk', [
                  {
                    index: 0,
                    delta: {role: 'assistant', content: '<think>\n\n'},
                    finish_reason: null,
                  },
                ]);
                first = false;
                thinking = true;
              }
              // todo: send them as thinking details
              logger.info(`Streaming response: ${JSON.stringify(lastMsg)}`);
              sendMessage('chat.completion.chunk', [
                {
                  index: 0,
                  delta: {content: `${lastMsg.name}: ${lastMsg.content} \n\n`},
                  finish_reason: null,
                },
              ]);
            }
          }
          if (lastMsg.response_metadata?.finish_reason === 'stop' && thinking) {
            sendMessage('chat.completion.chunk', [
              {
                index: 0,
                delta: {content: '</think>\n\n'},
                finish_reason: null,
              },
            ]);
          }
        }

        // Send final message
        if (stream) {
          logger.info(`Final response: ${JSON.stringify(fullResponse)}`);
          sendMessage('chat.completion.chunk', [
            {
              index: 0,
              delta: {role: 'assistant', content: fullResponse},
              finish_reason: 'stop',
            },
          ]);
        } else {
          sendMessage('chat.completion', [
            {
              index: 0,
              message: {role: 'assistant', content: fullResponse},
              finish_reason: 'stop',
            },
          ]);
        }
        res.end();
      } catch (error) {
        logger.error('Error processing request:', error);

        try {
          res.status(500).json({
            error: {
              message: (error as any).message,
              type: 'internal_server_error',
            },
          });
        } catch (e) {
          logger.error('Failed to send error response', e);
        }
      }
    });
  }
}
