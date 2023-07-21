// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SorobanBlock,
  SorobanEvent,
  SorobanEventFilter,
} from '@subql/types-soroban';
import { SorobanBlockWrapped } from './block.soroban';

describe('SorobanBlockWrapped', function () {
  const mockEvent: SorobanEvent = {
    ledger: '2000',
    ledgerClosedAt: null,
    contractId: 'testaddress',
    id: null,
    pagingToken: null,
    inSuccessfulContractCall: null,
    topic: [
      Buffer.from('topic1').toString('base64'),
      Buffer.from('topic2').toString('base64'),
    ],
    value: null,
  };
  const mockBlock: SorobanBlock = {
    ledger: 2000,
    hash: '2000',
    events: [mockEvent],
  };

  const mockEventFilterValid: SorobanEventFilter = {
    topics: ['topic1', 'topic2'],
  };

  const mockEventFilterInvalid: SorobanEventFilter = {
    topics: ['topics3'],
  };

  it('should pass filter - valid address and topics', function () {
    expect(
      SorobanBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterValid,
        'testaddress',
      ),
    ).toEqual(true);
  });

  it('should pass filter - no address and valid topics', function () {
    expect(
      SorobanBlockWrapped.filterEventProcessor(mockEvent, mockEventFilterValid),
    ).toEqual(true);
  });

  it('should fail filter - valid address and invalid topics', function () {
    expect(
      SorobanBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterInvalid,
        'testaddress',
      ),
    ).toEqual(false);
  });

  it('should fail filter - event not found', function () {
    mockEventFilterInvalid.topics = ['topic1', 'topic2', 'topic3'];
    expect(
      SorobanBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterInvalid,
      ),
    ).toEqual(false);
  });

  it('should pass filter - skip null topics', function () {
    mockEventFilterValid.topics = [null, 'topic2'];
    expect(
      SorobanBlockWrapped.filterEventProcessor(mockEvent, mockEventFilterValid),
    ).toEqual(true);
  });

  it('should pass filer - valid contractId', function () {
    mockEventFilterValid.contractId = 'testaddress';
    expect(
      SorobanBlockWrapped.filterEventProcessor(mockEvent, mockEventFilterValid),
    ).toEqual(true);
  });

  it('should fail filter - invalid contractId', function () {
    expect(
      SorobanBlockWrapped.filterEventProcessor(mockEvent, {
        contractId: 'invalidaddress',
      }),
    ).toEqual(false);
  });

  it('should fail filter - invalid address', function () {
    expect(
      SorobanBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterValid,
        'invalidaddress',
      ),
    ).toEqual(false);
  });
});
