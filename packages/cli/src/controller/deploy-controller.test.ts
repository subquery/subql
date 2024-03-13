// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {splitMultichainDataFields} from "./deploy-controller";


jest.setTimeout(30000);

describe("splitMultichainDataFields test", () => {
  test("Single chain, single endpoint", () => {
    const result=splitMultichainDataFields("chainIdididid:http://1.1.1.1");
    expect(result).toEqual({ chainIdididid: 'http://1.1.1.1' }
    );
  });

  test("multi chain, multi endpoint", () => {
    const result=splitMultichainDataFields("chainIdididid:http://1.1.1.1,chainIdididid222:http://2.2.2.2,chainIdididid333:http://3.3.33.3");
    expect(result).toEqual({"chainIdididid": "http://1.1.1.1", "chainIdididid222": "http://2.2.2.2", "chainIdididid333": "http://3.3.33.3"}
    );
  });

  test("Incorrect values (endpoint without chainId)", () => {
    const result=splitMultichainDataFields("http://2.2.2.2,http://2.2.2.3");
    expect(result).toEqual({});
  });


});
