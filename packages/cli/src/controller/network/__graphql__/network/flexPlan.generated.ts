import * as Types from '../base-types';

import gql from 'graphql-tag';

export const GetFlexPlans = gql`
  query GetFlexPlans($address: String!) {
    plans(filter: {and: {active: {equalTo: true}, creator: {equalTo: $address}}}, orderBy: ID_ASC) {
      totalCount
      nodes {
        id
        price
        deploymentId
        deployment {
          metadata
          project {
            id
            metadata
          }
        }
        planTemplate {
          period
          dailyReqCap
          rateLimit
          priceToken
          metadata
        }
      }
    }
  }
`;
