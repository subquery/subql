import * as Types from '../base-types';

import gql from 'graphql-tag';

export const GetProjectDeployments = gql`
  query GetProjectDeployments($projectId: String!) {
    project(id: $projectId) {
      deploymentId
      deployments(orderBy: CREATED_TIMESTAMP_DESC) {
        nodes {
          id
          metadata
          createdTimestamp
          createdBlock
        }
      }
    }
  }
`;
export const GetDeploymentIndexers = gql`
  query GetDeploymentIndexers($deploymentId: String!) {
    deployment(id: $deploymentId) {
      id
      indexers(orderBy: ID_ASC, filter: {status: {notEqualTo: TERMINATED}}) {
        nodes {
          indexerId
          status
          indexer {
            metadata
          }
        }
      }
    }
  }
`;
