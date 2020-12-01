import gql from 'graphql-tag';

export const directives = gql`
  directive @derivedFrom(field: String!) on FIELD_DEFINITION
  directive @entity on OBJECT
`;
