// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarBlock,
  StellarEvent,
  StellarEventFilter,
} from '@subql/types-stellar';
import { xdr } from 'soroban-client';
import { StellarBlockWrapped } from './block.stellar';

describe('StellarBlockWrapped', function () {
  const mockEvent: StellarEvent = {
    ledger: '2000',
    ledgerClosedAt: null,
    contractId: 'testaddress',
    id: null,
    pagingToken: null,
    inSuccessfulContractCall: null,
    topic: ['topic1', 'topic2'],
    value: null,
  };
  const mockBlock: StellarBlock = {
    ledger: 2000,
    hash: '2000',
    events: [mockEvent],
  };

  const mockEventFilterValid: StellarEventFilter = {
    topics: ['topic1', 'topic2'],
  };

  const mockEventFilterInvalid: StellarEventFilter = {
    topics: ['topics3'],
  };

  it('should pass filter - valid address and topics', function () {
    expect(
      StellarBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterValid,
        'testaddress',
      ),
    ).toEqual(true);
  });

  it('should pass filter - no address and valid topics', function () {
    expect(
      StellarBlockWrapped.filterEventProcessor(mockEvent, mockEventFilterValid),
    ).toEqual(true);
  });

  it('should fail filter - valid address and invalid topics', function () {
    expect(
      StellarBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterInvalid,
        'testaddress',
      ),
    ).toEqual(false);
  });

  it('should fail filter - event not found', function () {
    mockEventFilterInvalid.topics = ['topic1', 'topic2', 'topic3'];
    expect(
      StellarBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterInvalid,
      ),
    ).toEqual(false);
  });

  it('should pass filter - skip null topics', function () {
    mockEventFilterValid.topics = [null, 'topic2'];
    expect(
      StellarBlockWrapped.filterEventProcessor(mockEvent, mockEventFilterValid),
    ).toEqual(true);
  });

  it('should pass filer - valid contractId', function () {
    mockEventFilterValid.contractId = 'testaddress';
    expect(
      StellarBlockWrapped.filterEventProcessor(mockEvent, mockEventFilterValid),
    ).toEqual(true);
  });

  it('should fail filter - invalid contractId', function () {
    expect(
      StellarBlockWrapped.filterEventProcessor(mockEvent, {
        contractId: 'invalidaddress',
      }),
    ).toEqual(false);
  });

  it('should fail filter - invalid address', function () {
    expect(
      StellarBlockWrapped.filterEventProcessor(
        mockEvent,
        mockEventFilterValid,
        'invalidaddress',
      ),
    ).toEqual(false);
  });
});
