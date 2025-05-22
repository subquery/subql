// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ChatAnthropic} from '@langchain/anthropic';
import {ChatOpenAI} from '@langchain/openai';

export function createLLM() {
  const baseConfig = {
    model: process.env.LLM_MODEL || 'gpt-4o',
  };

  // Determine which provider to use
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';

  switch (provider) {
    case 'anthropic':
      return new ChatAnthropic({
        ...baseConfig,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        // Claude models have different names
        model: process.env.LLM_MODEL || 'claude-3-7-sonnet-latest',
      });
    case 'openai':
    default:
      return new ChatOpenAI({
        ...baseConfig,
        openAIApiKey: process.env.OPENAI_API_KEY || 'not-needed',
        configuration: process.env.LLM_BASE_URL
          ? {
              baseURL: process.env.LLM_BASE_URL,
            }
          : undefined,
      });
  }
}
