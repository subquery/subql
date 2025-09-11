import * as Types from '../base-types';

import gql from 'graphql-tag';

export const GetDeploymentBoost = gql`
  query GetDeploymentBoost($deploymentId: String!) {
    deploymentBoosterSummaries(
      filter: {and: {deploymentId: {equalTo: $deploymentId}, totalAmount: {greaterThan: "0"}}}
    ) {
      aggregates {
        sum {
          totalAmount
        }
      }
      nodes {
        consumer
        totalAmount
      }
    }
  }
`;
export const GetAccountBoost = gql`
  query GetAccountBoost($address: String!) {
    deploymentBoosterSummaries(
      filter: {and: {consumer: {equalTo: $address}, totalAmount: {greaterThan: "0"}}}
      orderBy: PROJECT_ID_ASC
    ) {
      aggregates {
        sum {
          totalAmount
        }
      }
      nodes {
        totalAmount
        deploymentId
        deployment {
          metadata
        }
        project {
          id
          metadata
        }
      }
    }
  }
`;
