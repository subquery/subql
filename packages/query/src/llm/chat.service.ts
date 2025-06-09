// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SystemMessage} from '@langchain/core/messages';
import {createReactAgent} from '@langchain/langgraph/prebuilt';
import {Injectable} from '@nestjs/common';
import {SqlToolkit} from 'langchain/agents/toolkits/sql';
import {SqlDatabase} from 'langchain/sql_db';
import {DataSource} from 'typeorm';
import {Config} from '../configure';
import {createLLM} from './createLLM';

type Agent = ReturnType<typeof createReactAgent>;

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: Config
  ) {}

  private agent?: Agent;

  async getAgent(): Promise<Agent> {
    if (this.agent) return this.agent;
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
* If it is a join query, \`_block_range @> 9223372036854775807\` is needed for all tables in the join
* If the query has an error consider the error and try again`
      ),
    });

    return this.agent;
  }

  async prompt(messages: string[]): Promise<string> {
    const agent = await this.getAgent();

    const result = await agent.stream({messages}, {streamMode: 'values'});
    let finalRes = '';
    for await (const event of result) {
      finalRes = event.messages[event.messages.length - 1].content as string;
    }

    return finalRes;
  }
}
