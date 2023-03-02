'use strict';
// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, '__esModule', { value: true });
exports.JsonfyDatasourcePlugin = void 0;
exports.JsonfyDatasourcePlugin = {
  kind: 'substrate/Jsonfy',
  validate(ds) {
    return;
  },
  dsFilterProcessor(ds, api) {
    return true;
  },
  handlerProcessors: {
    'substrate/JsonfyEvent': {
      specVersion: '1.0.0',
      baseFilter: [],
      baseHandlerKind: 'substrate/EventHandler',
      // eslint-disable-next-line @typescript-eslint/require-await
      async transformer({ original, ds }) {
        return JSON.parse(JSON.stringify(original.toJSON()));
      },
      filterProcessor({ filter, input, ds }) {
        return (
          filter.module &&
          input.event.section === filter.module &&
          filter.method &&
          input.event.method === filter.method
        );
      },
      filterValidator(filter) {
        return;
      },
    },
  },
};
exports.default = exports.JsonfyDatasourcePlugin;
//# sourceMappingURL=jsonfy.js.map
