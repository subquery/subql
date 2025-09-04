import * as Types from '../base-types';

import gql from 'graphql-tag';

export const GetProjects = gql`
  query GetProjects($address: String!) {
    projects(filter: {owner: {equalTo: $address}}, orderBy: ID_ASC) {
      nodes {
        id
        owner
        metadata
        totalAllocation
        totalBoost
        totalReward
        type
        deploymentId
      }
    }
  }
`;
