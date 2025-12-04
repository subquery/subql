// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import WebSocket from 'ws';
import {Request, ResponseSuccessType} from './types';

let id = 0;
export class WsJsonRpcClient {
  static async with<T>(url: string, callback: (client: WsJsonRpcClient) => Promise<T>): Promise<T> {
    const client = new WsJsonRpcClient(url);
    await client.isReady;
    const ret = await callback(client);
    client.destroy();
    return ret;
  }

  isReady!: Promise<WsJsonRpcClient>;
  protected _ws!: WebSocket;
  protected isDestroyed = false;

  protected handlers: {[id: string]: any};

  constructor(protected address: string) {
    this.handlers = {};
    this.connect();
  }

  connect(): void {
    try {
      this._ws = new WebSocket(this.address);

      this.isReady = new Promise((resolve) => {
        this._ws.on('open', () => resolve(this));
      });

      this._ws.on('close', this.onSocketClose);
      this._ws.on('message', this.onSocketMessage);
    } catch (error) {
      console.error(error);
    }
  }

  async send<T extends ResponseSuccessType>(method: string, params?: any[]): Promise<T> {
    await this.isReady;
    const req: Request = {jsonrpc: '2.0', id: id++, method, params};
    this._ws.send(JSON.stringify(req));
    return new Promise<T>((resolve, reject) => {
      this.handlers[req.id] = [resolve, reject];
    });
  }

  destroy(): void {
    this.isDestroyed = true;
    this._ws.close();
  }

  private onSocketClose = (code: number, reason: Buffer): void => {
    if (this.isDestroyed) return;

    console.error(`disconnected from ${this.address} code: '${code}' reason: '${reason.toString()}'`);
    setTimeout((): void => {
      this.connect();
    }, 1000);
  };

  private onSocketMessage = (dataStr: WebSocket.Data) => {
    try {
      const data = JSON.parse(dataStr.toString());
      if (data.id !== undefined && data.id !== null && this.handlers[data.id]) {
        const [resolve, reject] = this.handlers[data.id];
        delete this.handlers[data.id];
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.result);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };
}
