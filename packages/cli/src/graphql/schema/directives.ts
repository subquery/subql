import gql from 'graphql-tag';

export default gql`
  directive @derivedFrom(field: String!) on FIELD_DEFINITION
  directive @entity on OBJECT
`;
