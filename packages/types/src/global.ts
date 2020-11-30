import {ApiPromise} from '@polkadot/api';
import {Entity} from './interfaces';

declare global {
  const api: ApiPromise;

  namespace store {
    function get(entity: string, id: string): Promise<Entity | null>;
    function set(entity: string, id: string, data: Entity): Promise<void>;
    function remove(entity: string, id: string): Promise<void>;
  }
}
