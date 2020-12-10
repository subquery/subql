import {ApiPromise} from '@polkadot/api';
import {Store} from './interfaces';

declare global {
  const api: ApiPromise;

  const store: Store;
}
