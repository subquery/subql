// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as workers from 'worker_threads';
import {Logger} from 'pino';
import {getLogger} from '../../logger';
import '../../utils/bigint';

export type SerializableError = {
  message: string;
  stack?: string;
};

export type Request = {
  id: number | string;
  name: string;
  args: any[];
};

export type Response<T = any> = {
  id: number | string;
  error?: SerializableError;
  result?: T;
};

function isRequest(message: Request | Response): message is Request {
  return !!(message as Request).name;
}

function isResponse(message: Request | Response): message is Response {
  return !isRequest(message);
}

type ResponseListener = Record<number | string, (data?: any, error?: SerializableError) => void>;

export type AsyncFunc<T = any> = (...args: any[]) => T | Promise<T | void> | void;
type AsyncMethods = Record<string, AsyncFunc>;

abstract class WorkerIO {
  private responseListeners: ResponseListener = {};
  protected port: workers.MessagePort | workers.Worker;

  protected abstract getReqId(): number;

  constructor(
    port: workers.MessagePort | workers.Worker | undefined | null,
    workerFns: string[],
    private hostFns: AsyncMethods,
    protected logger: Logger
  ) {
    if (!port) {
      throw new Error('Port not provided to worker. WorkerHost most likely not run from worker thread.');
    }
    this.port = port;
    this.port.on('message', (message) => this.handleMessage(message));

    // Add expected methods to class
    workerFns.map((fn) => {
      if ((this as any)[fn]) {
        throw new Error(`Method ${String(fn)} is already defined`);
      }
      Object.assign(this, {[fn]: (...args: any[]) => this.execute(fn, args)});
    });
  }

  private handleMessage(message: Request | Response): void {
    if (isResponse(message)) {
      if (this.responseListeners[message.id]) {
        this.responseListeners[message.id](message.result, message.error);

        delete this.responseListeners[message.id];
      } else {
        this.logger.warn(`No handler found for request: "${message.id}"`);
      }
    } else if (isRequest(message)) {
      void this.handleRequest(message);
    } else {
      this.logger.warn(`Unsupported message: "${message}"`);
    }
  }

  private async handleRequest(req: Request): Promise<void> {
    const fn = this.hostFns[req.name];

    if (!fn) {
      this.port.postMessage(<Response>{
        id: req.id,
        error: {
          message: `handleRequest: Function "${req.name}" not found`,
        },
      });
      return;
    }

    try {
      const res = await fn(...req.args);

      this.port.postMessage(<Response>{
        id: req.id,
        result: res,
      });
    } catch (e) {
      this.port.postMessage(<Response>{
        id: req.id,
        error: e,
      });
    }
  }

  protected async execute<T>(fnName: keyof T, args: any[]): Promise<T> {
    const id = this.getReqId();

    return new Promise<T>((resolve, reject) => {
      try {
        this.responseListeners[id] = (data, error) => {
          if (error) {
            const e = new Error(error.message);
            e.stack = error.stack ?? e.stack;
            reject(e);
          } else {
            resolve(data);
          }
        };

        this.port.postMessage(<Request>{
          id,
          name: fnName,
          args,
        });
      } catch (e) {
        this.logger.error(
          e as any,
          `Failed to post message, function="${String(fnName)}", args="${JSON.stringify(args)}"`
        );
        reject(e);
      }
    });
  }
}

/* Worker side, used to initialise and interact with main thread */
export class WorkerHost<T extends AsyncMethods> extends WorkerIO {
  private _reqCounter = -1;

  private constructor(workerFns: (keyof T)[], hostFns: AsyncMethods, logger: Logger) {
    super(workers.parentPort, workerFns as string[], hostFns, logger);
  }

  static create<T extends AsyncMethods, H extends AsyncMethods>(
    workerFns: (keyof T)[],
    hostFns: H,
    logger: Logger
  ): WorkerHost<T> & T {
    const workerHost = new WorkerHost(workerFns, hostFns, logger);

    return workerHost as WorkerHost<T> & T;
  }

  // Host requests are in decreasing ID while Worker is increasing IDs to not conflict
  protected getReqId(): number {
    return this._reqCounter--;
  }
}

/* Host side, used to initialise and interact with worker */
export class Worker<T extends AsyncMethods> extends WorkerIO {
  private _reqCounter = 0;

  private constructor(private worker: workers.Worker, workerFns: (keyof T)[], hostFns: AsyncMethods) {
    super(worker, workerFns as string[], hostFns, getLogger(`worker: ${worker.threadId}`));

    this.worker.on('error', (error) => {
      this.logger.error(error, 'Worker error');
    });

    this.worker.on('messageerror', (error) => {
      this.logger.error(error, 'Worker message error');
    });

    this.worker.on('exit', (code) => {
      this.logger.error(`Worker exited with code ${code}`);
      process.exit(code);
    });
  }

  static create<T extends AsyncMethods, H extends AsyncMethods>(
    path: string,
    workerFns: (keyof T)[],
    hostFns: H,
    root: string
  ): Worker<T> & T {
    const argv = argsWithRoot(root);
    const worker = new Worker(
      new workers.Worker(path, {
        argv,
      }),
      workerFns,
      hostFns
    );

    return worker as Worker<T> & T;
  }

  // Host requests are in decreasing ID while Worker is increasing IDs to not conflict
  protected getReqId(): number {
    return this._reqCounter++;
  }

  async terminate(): Promise<number> {
    return this.worker.terminate();
  }
}

// Replaces the project path with a root.
// This is so that workers can used the local temp files if its originally from IPFS or GitHub
function argsWithRoot(root?: string) {
  if (!root) return process.argv;

  return [...process.argv, '--root', root];
}
