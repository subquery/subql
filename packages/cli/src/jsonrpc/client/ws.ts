// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ICloseEvent, w3cwebsocket as WebSocket} from 'websocket';
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

  isReady: Promise<WsJsonRpcClient>;
  protected _ws: WebSocket;
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
        this._ws.onopen = () => resolve(this);
      });

      this._ws.onclose = this.onSocketClose;
      this._ws.onmessage = this.onSocketMessage;
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

  private onSocketClose = (event: ICloseEvent): void => {
    if (this.isDestroyed) return;

    console.error(`disconnected from ${this.address} code: '${event.code}' reason: '${event.reason}'`);
    setTimeout((): void => {
      this.connect();
    }, 1000);
  };

  private onSocketMessage = ({data: dataStr}: {data: string}) => {
    try {
      const data = JSON.parse(String(dataStr));
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
