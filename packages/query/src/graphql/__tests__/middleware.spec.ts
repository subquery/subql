// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/**
 * Integration tests for Express middleware functions in graphql.module.ts.
 * Tests the actual middleware functions (limitQueryComplexity, limitQueryDepth,
 * limitQueryAliases, limitBatchedQueries) by mocking req, res, next.
 */
/* eslint-disable @typescript-eslint/unbound-method */
import {Request, Response, NextFunction} from 'express';
import {buildSchema} from 'graphql';

// Shared mutable argv object — graphql.module.ts destructures {argv} at module scope,
// so we must return the SAME object each time for changes to be visible to the middleware.
const sharedArgv: Record<string, any> = {
  name: 'test',
  'query-complexity': 5, // queries with >5 fields exceed limit
  'query-depth-limit': 5,
  'query-alias-limit': 3,
  'query-batch-limit': 5,
};

// Mock yargs before importing the module
jest.mock('../../yargs', () => {
  const getYargsOption = jest.fn(() => ({
    argv: sharedArgv,
  }));
  const argv = (arg: string) => getYargsOption().argv[arg];
  return {
    getYargsOption,
    argv,
  };
});

// Import the middleware functions (they're exported from graphql.module.ts)
import {
  limitQueryComplexity,
  limitQueryDepth,
  limitQueryAliases,
  limitBatchedQueries,
  corsMiddleware,
  cacheControlMiddleware,
  setMockPgInstance,
} from '../graphql.module';

const testSchema = buildSchema(`
  type Query {
    users: UserConnection
    posts: PostConnection
  }
  type UserConnection { nodes: [User] }
  type User {
    name: String
    posts: PostConnection
  }
  type PostConnection { nodes: [Post] }
  type Post {
    title: String
    comments: CommentConnection
  }
  type CommentConnection { nodes: [Comment] }
  type Comment { body: String }
`);

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    body: {query: `query { users { nodes { name } } }`},
    ...overrides,
  } as Request;
}

function mockRes(): Response {
  const res: any = {};
  const headers = new Map<string, string>();
  res.statusCode = 200;
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn((key: string, value: string) => {
    headers.set(key.toLowerCase(), String(value));
    return res;
  });
  res.getHeader = jest.fn((key: string) => headers.get(key.toLowerCase()));
  res.end = jest.fn();
  res.writeHead = jest.fn((statusCode: number) => {
    res.statusCode = statusCode;
    return res;
  });
  return res as Response;
}

function mockNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

describe('limitQueryComplexity middleware', () => {
  beforeAll(() => {
    // Provide a mock schema for the middleware to use
    setMockPgInstance({
      getSchemaResult: () => ({schema: testSchema}),
    } as any);
  });

  afterAll(() => {
    setMockPgInstance(null);
  });

  beforeEach(() => {
    // Reset to defaults
    sharedArgv['query-complexity'] = 5;
    sharedArgv['query-depth-limit'] = 5;
    sharedArgv['query-alias-limit'] = 3;
    sharedArgv['query-batch-limit'] = 5;
  });

  it('passes through when complexity is within limit', () => {
    // Simple query has complexity 3 (users, nodes, name) — within limit 5
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 400 when complexity exceeds limit', () => {
    const req = mockReq({
      body: {query: `query { users { nodes { name posts { nodes { title comments { nodes { body } } } } } } }`},
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('passes through GET requests', () => {
    const req = mockReq({method: 'GET'});
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('handles batched requests', () => {
    const req = mockReq({
      body: [{query: `query { users { nodes { name } } }`}, {query: `query { posts { nodes { title } } }`}],
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects entire batch if one query exceeds limit', () => {
    const req = mockReq({
      body: [
        {query: `query { users { nodes { name } } }`},
        {query: `query { users { nodes { name posts { nodes { title comments { nodes { body } } } } } } }`},
      ],
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('passes through when schema is not available', () => {
    setMockPgInstance(null);
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    setMockPgInstance({getSchemaResult: () => ({schema: testSchema})} as any);
  });

  it('passes through when --query-complexity is undefined', () => {
    sharedArgv['query-complexity'] = undefined;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects all queries when --query-complexity=0', () => {
    sharedArgv['query-complexity'] = 0;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    // Even the simplest query has complexity > 0, so it should be rejected
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns error response in correct format', () => {
    const req = mockReq({
      body: {query: `query { users { nodes { name posts { nodes { title comments { nodes { body } } } } } } }`},
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryComplexity(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([expect.any(Object)]),
      })
    );
  });
});

describe('limitQueryDepth middleware', () => {
  beforeEach(() => {
    sharedArgv['query-complexity'] = 10;
    sharedArgv['query-depth-limit'] = 5;
    sharedArgv['query-alias-limit'] = 3;
    sharedArgv['query-batch-limit'] = 5;
  });

  it('passes through when depth is within limit', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryDepth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 400 when depth exceeds limit', () => {
    const req = mockReq({
      body: {query: `query { users { nodes { name posts { nodes { title comments { nodes { body } } } } } } }`},
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryDepth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('passes through GET requests', () => {
    const req = mockReq({method: 'GET'});
    const res = mockRes();
    const next = mockNext();
    limitQueryDepth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('handles batched requests', () => {
    const req = mockReq({
      body: [{query: `query { users { nodes { name } } }`}, {query: `query { posts { nodes { title } } }`}],
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryDepth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through when --query-depth-limit is undefined', () => {
    sharedArgv['query-depth-limit'] = undefined;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryDepth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects all queries when --query-depth-limit=0', () => {
    sharedArgv['query-depth-limit'] = 0;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryDepth(req, res, next);
    // Any query with fields has depth >= 1, so limit=0 should reject
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('limitQueryAliases middleware', () => {
  beforeEach(() => {
    sharedArgv['query-complexity'] = 10;
    sharedArgv['query-depth-limit'] = 5;
    sharedArgv['query-alias-limit'] = 3;
    sharedArgv['query-batch-limit'] = 5;
  });

  it('passes through when alias count is within limit', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryAliases(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 400 when alias count exceeds limit', () => {
    const req = mockReq({
      body: {
        query: `query { u: users { nodes { n: name e: email p: posts { nodes { t: title } } } } p2: posts { nodes { t2: title } } }`,
      },
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryAliases(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('passes through GET requests', () => {
    const req = mockReq({method: 'GET'});
    const res = mockRes();
    const next = mockNext();
    limitQueryAliases(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('handles batched requests', () => {
    const req = mockReq({
      body: [{query: `query { users { nodes { name } } }`}, {query: `query { posts { nodes { title } } }`}],
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryAliases(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through when --query-alias-limit is undefined', () => {
    sharedArgv['query-alias-limit'] = undefined;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitQueryAliases(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects all queries with aliases when --query-alias-limit=0', () => {
    sharedArgv['query-alias-limit'] = 0;
    const req = mockReq({
      body: {query: `query { u: users { nodes { name } } }`},
    });
    const res = mockRes();
    const next = mockNext();
    limitQueryAliases(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('limitBatchedQueries middleware', () => {
  beforeEach(() => {
    sharedArgv['query-complexity'] = 10;
    sharedArgv['query-depth-limit'] = 5;
    sharedArgv['query-alias-limit'] = 3;
    sharedArgv['query-batch-limit'] = 5;
  });

  it('passes through single query', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitBatchedQueries(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through batch within limit', () => {
    const req = mockReq({
      body: [{query: `query { users { nodes { name } } }`}, {query: `query { posts { nodes { title } } }`}],
    });
    const res = mockRes();
    const next = mockNext();
    limitBatchedQueries(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects batch exceeding limit', () => {
    const req = mockReq({
      body: [
        {query: `query { a }`},
        {query: `query { b }`},
        {query: `query { c }`},
        {query: `query { d }`},
        {query: `query { e }`},
        {query: `query { f }`},
      ],
    });
    const res = mockRes();
    const next = mockNext();
    limitBatchedQueries(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({message: 'Batch query limit exceeded'})]),
      })
    );
  });

  it('passes through GET requests', () => {
    const req = mockReq({method: 'GET'});
    const res = mockRes();
    const next = mockNext();
    limitBatchedQueries(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through when --query-batch-limit is undefined', () => {
    sharedArgv['query-batch-limit'] = undefined;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    limitBatchedQueries(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects all batches when --query-batch-limit=0', () => {
    sharedArgv['query-batch-limit'] = 0;
    const req = mockReq({
      body: [{query: `query { a }`}, {query: `query { b }`}],
    });
    const res = mockRes();
    const next = mockNext();
    limitBatchedQueries(req, res, next);
    // batch-limit=0 means any batch with >0 queries exceeds limit
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('passes through non-array body', () => {
    const req = mockReq({body: {query: `query { users { nodes { name } } }`}});
    const res = mockRes();
    const next = mockNext();
    limitBatchedQueries(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('corsMiddleware', () => {
  beforeEach(() => {
    sharedArgv['query-complexity'] = 5;
  });

  it('sets CORS headers on POST', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    corsMiddleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    expect(next).toHaveBeenCalled();
  });

  it('handles OPTIONS preflight with 204 and no next()', () => {
    const req = mockReq({method: 'OPTIONS'});
    const res = mockRes();
    const next = mockNext();
    corsMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('echoes origin header when present', () => {
    const req = mockReq({headers: {origin: 'https://example.com'}});
    const res = mockRes();
    const next = mockNext();
    corsMiddleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
  });

  it('defaults to * when no origin header', () => {
    const req = mockReq({headers: {}});
    const res = mockRes();
    const next = mockNext();
    corsMiddleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
  });
});

describe('cacheControlMiddleware', () => {
  it('sets Cache-Control header on writeHead for success status', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    cacheControlMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    // Trigger the patched res.writeHead() — our middleware patches writeHead, not end
    res.writeHead(200);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=5');
  });

  it('does not set Cache-Control header on error responses (status >= 400)', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    cacheControlMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res.writeHead(500);
    // setHeader should not have been called by cacheControl
    const calls = (res.setHeader as jest.Mock).mock.calls.filter(([key]: [string]) => key === 'Cache-Control');
    expect(calls).toHaveLength(0);
  });

  it('does not override Cache-Control if already set by downstream', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();
    cacheControlMiddleware(req, res, next);

    res.setHeader('Cache-Control', 'private, no-cache');
    res.writeHead(200);
    // Should have been set only once (the downstream value)
    const calls = (res.setHeader as jest.Mock).mock.calls.filter(([key]: [string]) => key === 'Cache-Control');
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('private, no-cache');
  });
});
