// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Kind, parse, DocumentNode} from 'graphql';
import {checkAliasLimit} from '../QueryAliasLimitPlugin';

const EMPTY_DOC: DocumentNode = {kind: Kind.DOCUMENT, definitions: []};

describe('QueryAliasLimitPlugin', () => {
  const noAliasesQuery = `query {
    users {
      nodes {
        name
        email
      }
    }
  }`;

  const withAliasesQuery = `query {
    u: users {
      nodes {
        n: name
        e: email
        p: posts {
          nodes {
            t: title
          }
        }
      }
    }
    p: posts {
      nodes {
        t: title
      }
    }
  }`;

  const mixedQuery = `query {
    u: users {
      nodes {
        name
        email
      }
    }
    posts {
      nodes {
        title
      }
    }
  }`;

  it('does not throw when query has no aliases', () => {
    const doc = parse(noAliasesQuery);
    expect(() => checkAliasLimit(doc, 5)).not.toThrow();
  });

  it('does not throw when alias count within limit', () => {
    const doc = parse(withAliasesQuery);
    expect(() => checkAliasLimit(doc, 10)).not.toThrow();
  });

  it('throws when alias count exceeds limit', () => {
    const doc = parse(withAliasesQuery);
    expect(() => checkAliasLimit(doc, 3)).toThrow('Alias limit exceeded');
  });

  it('correctly counts aliased fields in mixed query', () => {
    const doc = parse(mixedQuery);
    // mixed query has 1 alias, limit 0 should throw
    expect(() => checkAliasLimit(doc, 0)).toThrow('Alias limit exceeded');
    // limit 1 should allow exactly 1 alias
    expect(() => checkAliasLimit(doc, 1)).not.toThrow();
    expect(() => checkAliasLimit(doc, 5)).not.toThrow();
  });

  it('throws even when only one alias exists and limit is 0', () => {
    const doc = parse(mixedQuery);
    expect(() => checkAliasLimit(doc, 0)).toThrow('Alias limit exceeded');
  });

  it('handles empty document gracefully', () => {
    expect(() => checkAliasLimit(EMPTY_DOC, 5)).not.toThrow();
  });
});
