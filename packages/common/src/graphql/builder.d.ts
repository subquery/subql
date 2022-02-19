export interface GqlVar {
    name: string;
    gqlType: string;
    value: unknown;
}
export interface GqlNode {
    entity: string;
    project?: Array<GqlNode | string>;
    args?: Record<string, unknown>;
}
export interface GqlQuery {
    query: string;
    variables: Record<string, unknown>;
}
export declare function buildQuery(vars: GqlVar[], nodes: GqlNode[]): GqlQuery;
