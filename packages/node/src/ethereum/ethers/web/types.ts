/* eslint-disable */
'use strict';
import http from 'http';
import https from 'https';

export type GetUrlResponse = {
  statusCode: number;
  statusMessage: string;
  headers: { [key: string]: string };
  body: Uint8Array | null;
};

export type Options = {
  method?: string;
  allowGzip?: boolean;
  body?: Uint8Array;
  headers?: { [key: string]: string };
  skipFetchSetup?: boolean;
  fetchOptions?: Record<string, string>;
  agents?: {
    http?: http.Agent;
    https?: https.Agent;
  };
};
