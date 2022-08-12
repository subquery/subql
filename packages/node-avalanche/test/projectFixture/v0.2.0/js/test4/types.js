'use strict';

const types = {
  types: {
    TestType: 'u32',
  },
  typesAlias: {
    Alias: {
      TestType2: 'test',
    },
  },
  typesBundle: {
    spec: {
      2312: {
        types: [
          {
            minmax: [232, 122],
            types: {
              TestType3: 'test3',
            },
          },
        ],
      },
    },
    chain: {
      mockchain: {
        types: [
          {
            minmax: [232, 122],
            types: {
              TestType4: 'test4',
            },
          },
        ],
      },
    },
  },
  typesChain: {
    chain2: {
      TestType5: 'test',
    },
  },
  typesSpec: {
    spec3: {
      TestType6: 'test',
    },
  },
  shouldIgnorefield: {
    chain2: {
      TestType5: 'test',
    },
  },
};

Object.defineProperty(exports, '__esModule', {
  value: true,
});

exports.default = types;
