// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'node:path';
import {stripVTControlCharacters} from 'node:util';
import {confirm, input, search, checkbox} from '@inquirer/prompts';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {RequestHandlerExtra} from '@modelcontextprotocol/sdk/shared/protocol';
import {CallToolResult, ElicitRequest, ServerNotification, ServerRequest} from '@modelcontextprotocol/sdk/types';
import {Args, Command, Flags} from '@oclif/core';
import {Flag, Arg} from '@oclif/core/lib/interfaces';
import fuzzy from 'fuzzy';
import {z, ZodTypeAny, ZodObject, ZodOptional, ZodDefault, ZodArray} from 'zod';

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

type ZodToPrimitiveArray<T extends ZodTypeAny> =
  T extends z.ZodArray<infer U> ? ZodToPrimitive<U>[] : ZodToPrimitive<T>;

// Check if optional
type HasDefault<T extends ZodTypeAny> = T extends ZodDefault<any> ? true : false;
type IsOptional<T extends ZodTypeAny> = T extends ZodOptional<any> ? true : false;
type IsArray<T extends ZodTypeAny> = T extends ZodArray<any> ? true : false;

// Combine to determine final flag type
type FlagFromZod<T extends ZodTypeAny> =
  HasDefault<T> extends true
    ? Flag<ZodToPrimitiveArray<UnwrapZod<T>>>
    : IsOptional<T> extends true
      ? Flag<ZodToPrimitiveArray<UnwrapZod<T>> | undefined>
      : Flag<ZodToPrimitiveArray<T>>;

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

type UnwrapInfo = {type: ZodTypeAny; default: any; array: boolean; optional: boolean};

// Unrwap recursive type information to get the primitive and other information
function unwrap(
  def: ZodTypeAny,
  unwrapInfo: UnwrapInfo = {type: def, default: undefined, array: false, optional: false}
): UnwrapInfo {
  if (def instanceof z.ZodDefault) {
    return unwrap(def._def.innerType, {
      ...unwrapInfo,
      type: def._def.innerType,
      default: def._def.defaultValue(),
    });
  }
  if (def instanceof z.ZodOptional) {
    return unwrap(def._def.innerType, {
      ...unwrapInfo,
      type: def._def.innerType,
      optional: true,
    });
  }
  if (def instanceof z.ZodArray) {
    return unwrap(def._def.type, {
      ...unwrapInfo,
      type: def._def.type,
      array: true,
    });
  }
  return unwrapInfo;
}

// Runtime impl
export function zodToFlags<Shape extends Record<string, ZodTypeAny>>(schema: ZodObject<Shape>): FlagsFromSchema<Shape> {
  const flags: Record<string, Flag<any>> = {};

  for (const [key, def] of Object.entries(schema.shape)) {
    const description = def.description ?? '';

    const {type, default: defaultValue, array, optional} = unwrap(def);

    if (type instanceof z.ZodString) {
      flags[key] = Flags.string({
        description,
        required: !optional,
        default: defaultValue,
        multiple: array as any, // Gets around a type issue
      });
    } else if (type instanceof z.ZodNumber) {
      flags[key] = Flags.integer({
        description,
        required: !optional,
        default: defaultValue,
        multiple: array as any, // Gets around a type issue
      });
    } else if (type instanceof z.ZodBoolean) {
      flags[key] = Flags.boolean({
        description,
        default: defaultValue,
      });
    } else if (type instanceof z.ZodEnum) {
      flags[key] = Flags.string({
        description,
        required: !optional,
        default: defaultValue,
        options: type.options,
        multiple: array as any, // Gets around a type issue
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

    const {type, default: defaultValue, array, optional} = unwrap(def);

    if (type instanceof z.ZodString) {
      args[key] = Args.string({
        description,
        required: !optional,
        default: defaultValue,
        multiple: array,
      });
    } else if (type instanceof z.ZodNumber) {
      args[key] = Args.integer({
        description,
        required: !optional,
        default: defaultValue,
      });
    } else if (type instanceof z.ZodBoolean) {
      args[key] = Args.boolean({
        description,
        default: defaultValue,
        multiple: array,
      });
    } else if (type instanceof z.ZodEnum) {
      args[key] = Args.string({
        description,
        required: !optional,
        default: defaultValue,
        multiple: array,
        options: type.options,
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
      message: stripVTControlCharacters(input),
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
    info: () => {
      /* Do Nothing */
    },
    warn: () => {
      /* Do Nothing */
    },
    error: () => {
      /* Do Nothing */
    },
    debug: () => {
      /* Do Nothing */
    },
  };
}

export type PromptTypes = {
  string: string;
  number: number;
  boolean: boolean;
};

export type Prompt = <T extends keyof PromptTypes, M extends boolean | undefined = undefined>(opts: {
  message: string;
  type: T;
  required?: boolean;
  options?: PromptTypes[T][];
  defaultValue?: PromptTypes[T];
  multiple?: M;
}) => Promise<M extends true ? PromptTypes[T][] : PromptTypes[T]>;

export function makeInputSchema<T extends keyof PromptTypes>(
  type: T,
  required?: boolean,
  mmultiple?: boolean,
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
  return async ({defaultValue, message, multiple, options, required, type}) => {
    const res = await server.server.elicitInput({
      message,
      requestedSchema: makeInputSchema(type, required, multiple, options, defaultValue),
    });

    if (res.action === 'reject') {
      throw new Error('User rejected the input');
    }

    if (res.action === 'cancel') {
      throw new Error('User cancelled the input');
    }

    if (res.action === 'accept') {
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
  return async ({defaultValue, message, multiple, options, required, type}) => {
    if (!options?.length && multiple) {
      throw new Error('Multiple selection requires options to be provided');
    }
    if (type === 'string') {
      if (options) {
        if (multiple) {
          return checkbox<string>({
            message,
            choices: (options as string[]).map((key) => ({value: key})),
          });
        }
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

export function formatErrorCauses(e: Error): string {
  let message = e.message;
  while (e.cause) {
    e = e.cause as Error;
    message += `:\n cause: ${e.message}`;
  }
  return message;
}

export function getMCPStructuredResponse<T extends z.ZodRawShape>(
  result: z.ZodObject<T>
): z.ZodObject<{result: z.ZodOptional<z.ZodObject<T>>; error: z.ZodOptional<z.ZodString>}> {
  return z.object({
    result: z.optional(result),
    error: z.optional(z.string().describe('Error message if the command fails')),
  });
}

/**
 * Wraps a promise to provide a structured response for MCP tools including error handling.
 * @param p A promise which should resolve with T as the same structure as the input to getMCPStructuredResponse
 * @returns
 */
export function withStructuredResponse<I, O>(
  p: (input: I, meta: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<O>
): (input: I, meta: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<CallToolResult> {
  return async (i, meta) => {
    try {
      const result = await p(i, meta);

      return {
        structuredContent: {
          result,
        },
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e: any) {
      return {
        structuredContent: {
          error: formatErrorCauses(e as Error),
        },
        content: [
          {
            type: 'text',
            text: `Error running: ${formatErrorCauses(e)}`,
          },
        ],
      };
    }
  };
}

export type MCPToolOptions = {
  /**
   * Whether or not the client supports elicitaion and the user can be prompted for more information
   */
  supportsElicitation?: boolean;
};

export async function getMCPWorkingDirectory(server: McpServer): Promise<string> {
  const {roots} = await server.server.listRoots();

  for (const root of roots) {
    if (root.uri.startsWith('file://')) {
      return path.resolve(root.uri.replace('file://', ''));
    }
  }

  throw new Error('No valid working directory found in MCP roots.');
}
