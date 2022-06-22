// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SubqlCosmosMessageFilter } from '@subql/common-cosmos';
import { DictionaryService } from './dictionary.service';

import { messageFilterToQueryEntry } from './fetch.service';

type DictionaryQuery = DictionaryService['dictionaryQuery'];

type DictionaryServicePrivate = DictionaryService & {
  dictionaryQuery: DictionaryQuery;
};

function mockDictionaryService(url: string): DictionaryServicePrivate {
  return new DictionaryService({
    network: {
      dictionary: url,
    },
  } as any) as DictionaryServicePrivate;
}

describe('Dictionary Queries', () => {
  let dictionary: DictionaryServicePrivate;

  beforeAll(() => {
    dictionary = mockDictionaryService('http://localhost:3000'); // TODO get url
  });

  describe('Message Filter Queries', () => {
    it('Basic wasm filter works', () => {
      const filter: SubqlCosmosMessageFilter = {
        type: '/cosmwasm.wasm.v1.MsgExecuteContract',
      };

      const condition = messageFilterToQueryEntry(filter);

      const query = (dictionary as any).dictionaryQuery(
        3_093_822,
        4_000_000,
        5,
        [condition],
      );

      expect(query).toEqual({
        query: `query($messages_0_0:String!){_metadata {lastProcessedHeight chain }  messages (filter:{or:[{type:{equalTo:$messages_0_0}}],blockHeight:{greaterThanOrEqualTo:"3093822",lessThan:"4000000"}},orderBy:BLOCK_HEIGHT_ASC,first:5){nodes {blockHeight }  } }`,
        variables: { messages_0_0: '/cosmwasm.wasm.v1.MsgExecuteContract' },
      });
    });

    it('Wasm with contract filter builds a valid query', () => {
      const filter: SubqlCosmosMessageFilter = {
        type: '/cosmwasm.wasm.v1.MsgExecuteContract',
        contractCall: 'vote',
        values: {
          contract:
            'juno1lgnstas4ruflg0eta394y8epq67s4rzhg5anssz3rc5zwvjmmvcql6qps2',
        },
      };

      const condition = messageFilterToQueryEntry(filter);

      const query = (dictionary as any).dictionaryQuery(
        3_093_822,
        4_000_000,
        5,
        [condition],
      );

      expect(query).toEqual({
        query: `query($messages_0_0:String!,$messages_0_1:JSON){_metadata {lastProcessedHeight chain }  messages (filter:{or:[{and:[{type:{equalTo:$messages_0_0}},{data:{contains:$messages_0_1}}]}],blockHeight:{greaterThanOrEqualTo:"3093822",lessThan:"4000000"}},orderBy:BLOCK_HEIGHT_ASC,first:5){nodes {blockHeight }  } }`,
        variables: {
          messages_0_0: '/cosmwasm.wasm.v1.MsgExecuteContract',
          messages_0_1: {
            contract:
              'juno1lgnstas4ruflg0eta394y8epq67s4rzhg5anssz3rc5zwvjmmvcql6qps2',
          },
        },
      });
    });

    it('Wasm with nested filter works', () => {
      const filter: SubqlCosmosMessageFilter = {
        type: '/cosmwasm.wasm.v1.MsgExecuteContract',
        contractCall: 'swap',
        values: {
          'msg.swap.input_token': 'Token2',
        },
      };

      const condition = messageFilterToQueryEntry(filter);

      expect(condition.conditions[1].value).toEqual({
        msg: { swap: { input_token: 'Token2' } },
      });
    });

    // it('Wasm with enum filter works', () => {
    //   const filter: SubqlCosmosMessageFilter = {
    //     type: '/cosmwasm.wasm.v1.MsgExecuteContract',
    //     contractCall: 'swap',
    //     values: {
    //       'msg.swap.input_token': 'Token2',
    //     },
    //   };

    //   const condition = messageFilterToQueryEntry(filter);

    //   console.log('CONDITION', condition, condition.conditions[1].value);

    //   const query = (dictionary as any).dictionaryQuery(
    //     3_093_822, 4_000_000, 5, [condition]
    //   );

    //   console.log('QUERY', query.query, query.variables);

    // });
  });

  // describe('Event Filter Queries', () => {

  // });
});
