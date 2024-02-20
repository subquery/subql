// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { BlockHash, RuntimeVersion } from '@polkadot/types/interfaces';
import { ApiService } from '../api.service';
import {
  SubstrateDictionaryV1,
  SpecVersion,
  SpecVersionDictionary,
  SubstrateDictionaryService,
} from '../dictionary';
import { SPEC_VERSION_BLOCK_GAP } from './base-runtime.service';
import { RuntimeService } from './runtimeService';

// const specVersions: SpecVersion[] = [
//   { id: '0', start: 1, end: 29231 },
//   { id: '1', start: 29232, end: 188836 },
//   { id: '5', start: 188837, end: 199405 },
//   { id: '6', start: 199406, end: 214264 },
//   { id: '7', start: 214265, end: 244358 },
//   { id: '8', start: 244359, end: 303079 },
//   { id: '9', start: 303080, end: 314201 },
//   { id: '10', start: 314202, end: 342400 },
//   { id: '11', start: 342401, end: 443963 },
//   { id: '12', start: 443964, end: 528470 },
//   { id: '13', start: 528471, end: 687751 },
//   { id: '14', start: 687752, end: 746085 },
//   { id: '15', start: 746086, end: null },
// ];
//
// const getApiService = (): ApiService =>
//   ({
//     api: {
//       rpc: {
//         chain: {
//           getBlockHash: (height: number): Promise<BlockHash> => {
//             return Promise.resolve(`${height}` as any as BlockHash);
//           },
//         },
//         state: {
//           getRuntimeVersion: (blockHash: string): Promise<RuntimeVersion> => {
//             // Treat 0 as 1 for parent hash of block 1
//             const blockNum = Math.max(parseInt(blockHash), 1);
//
//             const { id } = specVersions.find(
//               (v) => v.start <= blockNum && (!v.end || v.end >= blockNum),
//             );
//
//             return Promise.resolve({
//               specVersion: {
//                 toNumber: () => parseInt(id),
//               },
//             } as RuntimeVersion);
//           },
//         },
//       },
//       getBlockRegistry: (hash: string) => Promise.resolve(),
//     },
//   } as any);
//
// const getDictionaryService = (): SubstrateDictionaryV1 =>
//   ({
//     useDictionary: false,
//     getSpecVersions: (): Promise<SpecVersion[]> => {
//       return Promise.resolve(specVersions);
//     },
//     parseSpecVersions: (raw: SpecVersionDictionary): SpecVersion[] => {
//       throw new Error('Not implemented');
//     },
//     initDictionariesV1:()=>{
//       //TODO
//     },
//     initDictionariesV2:()=>{
//       //TODO
//     }
//   } as any);
//
// describe('Runtime service', () => {
//   let runtimeService: RuntimeService;
//   let dictionaryService: SubstrateDictionaryService;
//   let apiService: ApiService;
//
//   beforeEach(() => {
//     dictionaryService = getDictionaryService();
//     apiService = getApiService();
//
//     runtimeService = new RuntimeService(apiService, dictionaryService);
//   });
//
//   it('doesnt refetch metadata when spec version doesnt change', async () => {
//     const metaSpy = jest.spyOn(apiService.api, 'getBlockRegistry');
//
//     // This gets called when fetching each block
//     await runtimeService.specChanged(1);
//     await runtimeService.specChanged(2);
//     await runtimeService.specChanged(3);
//
//     expect(metaSpy).toHaveBeenCalledTimes(1);
//   });
//
//   it('fetches metadata only when spec version changes', async () => {
//     const metaSpy = jest.spyOn(apiService.api, 'getBlockRegistry');
//
//     // This gets called when fetching each block
//     await runtimeService.specChanged(29230);
//     await runtimeService.specChanged(29231);
//     await runtimeService.specChanged(29232); // Spec change here
//     await runtimeService.specChanged(29233);
//
//     expect(metaSpy).toHaveBeenCalledTimes(2);
//   });
//
//   it('use dictionary and specVersionMap to get block specVersion', async () => {
//     (dictionaryService as any).useDictionary = true;
//
//     // This is called in fetchService.preLoopHook
//     await runtimeService.syncDictionarySpecVersions();
//
//     const metaSpy = jest.spyOn(apiService.api.rpc.state, 'getRuntimeVersion');
//
//     await runtimeService.getSpecVersion(29233);
//
//     expect(metaSpy).not.toHaveBeenCalled();
//   });
//
//   it('getSpecVersion will fetch the spec version if its not in the map', async () => {
//     (dictionaryService as any).useDictionary = true;
//
//     const height = 3967204;
//
//     const apiSpy = jest.spyOn(apiService.api.rpc.state, 'getRuntimeVersion');
//     const dictSpy = jest.spyOn(dictionaryService, 'getSpecVersions');
//
//     runtimeService.latestFinalizedHeight = height + SPEC_VERSION_BLOCK_GAP + 1;
//     await runtimeService.getSpecVersion(height);
//
//     expect(apiSpy).toHaveBeenCalled();
//     expect(dictSpy).toHaveBeenCalled();
//   });
//
//   // OLD tests from fetch.service, unsure how to implements
//   // it('use api to get block specVersion when blockHeight out of specVersionMap', () => {
//
//   // });
//
//   // it('only fetch SpecVersion from dictionary once', () => {
//
//   // });
//
//   // it('update specVersionMap once when specVersion map is out', () => {
//
//   // });
//
//   // // Was skipped previously
//   // it('prefetch meta for different specVersion range', () => {
//
//   // });
// });
