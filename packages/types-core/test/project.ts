// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// import {ProjectManifestV1_0_0} from '@subql/common';
// import {ProjectManifestV1_0_0Impl} from '@subql/common-substrate';
// import {ProjectManifestImpls} from './ProjectManifestVersioned'
// import {SubstrateDatasource} from '@subql/types';

//
// const manifest: ProjectManifestV1_0_0<SubstrateDatasource> = {
//   version: '1',
//   name: 'aaa',
//   schema: {file:'path/to/schema'},
//   specVersion: '1.0.0',
//   network: {
//     endpoint: '',
//     chainId: '137',
//   },
//   dataSources:[
//     {
//       kind:'substrate/Runtime',
//       startBlock:1,
//       mapping:{
//         file:'',
//         handlers:[{handler:'handleBond',kind:'substrate/BlockHandler'}],
//
//       }
//     }
//   ],
//   runner: {
//     query:{
//       name:'@subql/query',
//       version:'*'
//     },
//     node:{
//       name:'@subql/node',
//       version:'*'
//     }},
//   description:''
// }
