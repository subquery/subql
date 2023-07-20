// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {camelCaseObjectKey} from './object';

it('Convert objects key to camelCase', () => {
  const object = {
    entity: 'someEntity',
    active_for_auction: 'someAuction',
  };

  const result = camelCaseObjectKey(object);

  expect(result).toEqual({
    entity: 'someEntity',
    activeForAuction: 'someAuction',
  });
});
