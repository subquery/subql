import {gql} from 'graphql-request';

export const queryUserProjects = gql`
  query ($address: String!) {
    projects(filter: {owner: {equalTo: $address}}) {
      nodes {
        id
        owner
      }
    }
  }
`;
