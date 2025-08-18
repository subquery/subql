import {z} from 'zod';
import {Apikey, StateChannel as ApiStateChannel} from './consumer-host-service-api';

export const apiKeySchema = z.object({
  id: z.number(),
  name: z.string(),
  apiKey: z.string(),
  times: z.number(),
  createdAt: z.string().datetime(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

export function convertApiKey(apiKey: Apikey): ApiKey {
  return apiKeySchema.parse({
    id: apiKey.id,
    name: apiKey.name,
    apiKey: apiKey.value,
    times: apiKey.times,
    createdAt: apiKey.created_at,
  });
}

export const stateChannelSchema = z.object({
  id: z.number(),
  consumer: z.string(),
  indexer: z.string(),
  deploymentId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type StateChannel = z.infer<typeof stateChannelSchema>;

export function convertStateChannel(channel: ApiStateChannel): StateChannel {
  return stateChannelSchema.parse({
    id: channel.id,
    consumer: channel.user_id,
    indexer: channel.indexer_id,
    deploymentId: channel.deployment,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
  });
}
