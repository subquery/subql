// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Args, Command, Flags} from '@oclif/core';
import {Flag, Arg, Logger as OClifLogger} from '@oclif/core/lib/interfaces';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z, ZodTypeAny, ZodObject, ZodOptional, ZodDefault} from 'zod';
import fuzzy from 'fuzzy';
import {ElicitRequest} from '@modelcontextprotocol/sdk/types';
import {confirm, input, search} from '@inquirer/prompts';

export type Logger = {
  info: (message: string) => void;
  debug: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
};

// Extract base type from optional/default wrappers
type UnwrapZod<T extends ZodTypeAny> =
  T extends ZodOptional<infer U> ? UnwrapZod<U> : T extends ZodDefault<infer U> ? UnwrapZod<U> : T;

// Get JS type from base Zod type
type ZodToPrimitive<T extends ZodTypeAny> = T extends z.ZodString
  ? string
  : T extends z.ZodNumber
    ? number
    : T extends z.ZodBoolean
      ? boolean
      : never;

// Check if optional
type HasDefault<T extends ZodTypeAny> = T extends ZodDefault<any> ? true : false;
type IsOptional<T extends ZodTypeAny> = T extends ZodOptional<any> ? true : false;

// Combine to determine final flag type
type FlagFromZod<T extends ZodTypeAny> =
  HasDefault<T> extends true
    ? Flag<ZodToPrimitive<UnwrapZod<T>>>
    : IsOptional<T> extends true
      ? Flag<ZodToPrimitive<UnwrapZod<T>> | undefined>
      : Flag<ZodToPrimitive<T>>;

// Map over the schema
type FlagsFromSchema<Shape extends Record<string, ZodTypeAny>> = {
  [K in keyof Shape]: FlagFromZod<Shape[K]>;
};

type ArgFromZod<T extends ZodTypeAny> =
  HasDefault<T> extends true
    ? Arg<ZodToPrimitive<UnwrapZod<T>>>
    : IsOptional<T> extends true
      ? Arg<ZodToPrimitive<UnwrapZod<T>> | undefined>
      : Arg<ZodToPrimitive<T>>;

type ArgsFromSchema<Shape extends Record<string, ZodTypeAny>> = {
  [K in keyof Shape]: ArgFromZod<Shape[K]>;
};

function unwrap(zod: ZodTypeAny): ZodTypeAny {
  if (zod instanceof z.ZodDefault) return unwrap(zod._def.innerType);
  if (zod instanceof z.ZodOptional) return unwrap(zod._def.innerType);
  return zod;
}

// Runtime impl
export function zodToFlags<Shape extends Record<string, ZodTypeAny>>(schema: ZodObject<Shape>): FlagsFromSchema<Shape> {
  const flags: Record<string, Flag<any>> = {};

  for (const [key, def] of Object.entries(schema.shape)) {
    const description = def.description ?? '';

    const base = unwrap(def);

    if (base instanceof z.ZodString) {
      flags[key] = Flags.string({
        description,
        required: !(def instanceof z.ZodOptional || def instanceof z.ZodDefault),
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
      });
    } else if (base instanceof z.ZodNumber) {
      flags[key] = Flags.integer({
        description,
        required: !(def instanceof z.ZodOptional || def instanceof z.ZodDefault),
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
      });
    } else if (base instanceof z.ZodBoolean) {
      flags[key] = Flags.boolean({
        description,
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
      });
    } else if (base instanceof z.ZodEnum) {
      flags[key] = Flags.string({
        description,
        required: !(def instanceof z.ZodOptional || def instanceof z.ZodDefault),
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
        options: base.options,
      });
    } else {
      throw new Error(`Unsupported Zod type for flag: ${key}`);
    }
  }

  return flags as FlagsFromSchema<Shape>;
}

export function zodToArgs<Shape extends Record<string, ZodTypeAny>>(schema: ZodObject<Shape>): ArgsFromSchema<Shape> {
  const args: Record<string, Arg<any>> = {};

  for (const [key, def] of Object.entries(schema.shape)) {
    const description = def.description ?? '';

    const base = unwrap(def);

    if (base instanceof z.ZodString) {
      args[key] = Args.string({
        description,
        required: !(def instanceof z.ZodOptional || def instanceof z.ZodDefault),
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
      });
    } else if (base instanceof z.ZodNumber) {
      args[key] = Args.integer({
        description,
        required: !(def instanceof z.ZodOptional || def instanceof z.ZodDefault),
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
      });
    } else if (base instanceof z.ZodBoolean) {
      args[key] = Args.boolean({
        description,
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
      });
    } else if (base instanceof z.ZodEnum) {
      args[key] = Args.string({
        description,
        required: !(def instanceof z.ZodOptional || def instanceof z.ZodDefault),
        default: def instanceof z.ZodDefault ? def._def.defaultValue() : undefined,
        options: base.options,
      });
    } else {
      throw new Error(`Unsupported Zod type for arg: ${key}`);
    }
  }

  return args as ArgsFromSchema<Shape>;
}

export function mcpLogger(server: McpServer['server']): Logger {
  const log = (level: 'error' | 'debug' | 'info' | 'notice') => (input: string) => {
    void server.sendLoggingMessage({
      level,
      message: input,
    });
  };
  return {
    debug: (message) => log('debug')(message),
    warn: (message) => log('notice')(message),
    error: (message) => log('error')(message),
    info: (message) => log('info')(message),
  };
}

export function commandLogger(command: Command): Logger {
  return {
    info: command.log.bind(command),
    warn: command.warn.bind(command),
    error: command.error.bind(command),
    debug: (command as any).debug.bind(command),
  };
}

export function silentLogger(): Logger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
}

export type PromptTypes = {
  string: string;
  number: number;
  boolean: boolean;
};

export type Prompt = <T extends keyof PromptTypes>(opts: {
  message: string;
  type: T;
  required?: boolean;
  options?: PromptTypes[T][];
  defaultValue?: PromptTypes[T];
}) => Promise<PromptTypes[T]>;

export function makeInputSchema<T extends keyof PromptTypes>(
  type: T,
  required?: boolean,
  options?: PromptTypes[T][],
  defaultValue?: PromptTypes[T]
): ElicitRequest['params']['requestedSchema'] {
  if (type === 'string') {
    return {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          default: defaultValue as PromptTypes['string'],
          enum: options as string[] | undefined,
          description: 'Input string',
        },
      },
      required: ['input'],
      additionalProperties: false,
    };
    // } else if (type === 'number') {
    //   return zodToJsonSchema(
    //     z.object({
    //       input: z
    //         .number()
    //         .default(defaultValue as PromptTypes['number'])
    //         .optional(),
    //     })
    //   );
    // } else if (type === 'boolean') {
    //   return zodToJsonSchema(
    //     z.object({
    //       input: z
    //         .boolean()
    //         .default(defaultValue as PromptTypes['boolean'])
    //         .optional(),
    //     })
    //   );
  } else {
    throw new Error(`Unsupported prompt type: ${type}`);
  }
}

export function makeMCPElicitPrmompt(server: McpServer): Prompt {
  return async ({message, type, options, required, defaultValue}) => {
    const res = await server.server.elicitInput({
      message,
      requestedSchema: makeInputSchema(type, required, options, defaultValue),
    });

    if (res.action === 'reject') {
      throw new Error('User rejected the input');
    }

    if (res.action === 'cancel') {
      throw new Error('User cancelled the input');
    }

    if (res.action == 'accept') {
      const input = res.content?.input;
      if (input === undefined) {
        throw new Error(`Input for ${message} is required`);
      }
      if (type === 'string') {
        return input as any; // TODO fix type, string doesn't work for some reason
      }
      if (type === 'boolean') {
        return input === 'true';
      }
      if (type === 'number') {
        const num = Number(input);
        if (isNaN(num)) {
          throw new Error(`Input for ${message} must be a number`);
        }
        return num;
      }
    }

    throw new Error(`Invalid elicit input response: ${JSON.stringify(res)}`);
  };
}

// Helper function for fuzzy search on prompt input
function filterInput<T>(arr: T[]) {
  return (input: string | undefined): Promise<ReadonlyArray<{value: T}>> => {
    input ??= '';
    return Promise.resolve(fuzzy.filter(input, arr).map((r) => ({value: r.original})));
  };
}

export function makeCLIPrompt(): Prompt {
  return async ({message, type, required, options, defaultValue}) => {
    if (type === 'string') {
      if (options) {
        return search<string>({
          message,
          source: filterInput<string>(options as string[]),
          pageSize: 10,
        });
      }

      return input({
        message,
        default: defaultValue as string | undefined,
        required,
      });
    }
    if (type === 'number') {
      if (options) {
        throw new Error('Number type does not support options');
      }
      const res = await input({
        message,
        default: defaultValue?.toString() as string | undefined,
        required,
      });
      const num = Number(res);
      if (isNaN(num)) {
        throw new Error(`Input for ${message} must be a number`);
      }
      return num as any; // For some reason setting this to any fixes the type issue for this function
    }
    if (type === 'boolean') {
      return confirm({
        message,
        default: defaultValue as boolean | undefined,
      });
    }

    throw new Error(`Unsupported prompt type: ${type}`);
  };
}

export const mcpInputs = z.object({
  cwd: z.string({description: 'The current working directory.'}),
});
