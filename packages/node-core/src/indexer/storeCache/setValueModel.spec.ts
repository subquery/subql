// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SetValueModel} from './setValueModel';

describe('SetValueModel', () => {
  let model: SetValueModel<string>;

  beforeAll(() => {
    model = new SetValueModel<string>();

    let n = 0;
    while (n < 5) {
      model.set(n.toString(), n, n);
      n++;
    }
  });

  it('fromBelowHeight works', () => {
    expect(model.fromBelowHeight(5).getValues()).toEqual(model.getValues());

    expect(model.fromBelowHeight(2).getValues()).toEqual([
      {data: '0', startHeight: 0, endHeight: 1, operationIndex: 0, removed: false},
      {data: '1', startHeight: 1, endHeight: null, operationIndex: 1, removed: false},
    ]);
  });

  it('fromAboveHeight works', () => {
    expect(model.fromAboveHeight(6).getValues()).toEqual([]);
    expect(model.fromAboveHeight(3).getValues()).toEqual([
      {data: '4', startHeight: 4, endHeight: null, operationIndex: 4, removed: false},
    ]);
  });
});
