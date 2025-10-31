/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Payload {
  /** The message that has a signature for it */
  message?: string;
  /** User signature */
  signature?: string;
}

export interface QueryToken {
  /** User token */
  token?: string;
}

export interface QueryState {
  /** @format U256 */
  channel_id?: number;
  /** Indexer address */
  indexer?: string;
  /** Consumer address */
  consumer?: string;
  /** @format U256 */
  spent?: number;
  /** @format U256 */
  remote?: number;
  is_final?: boolean;
  indexer_sign?: string;
  consumer_sign?: string;
}

export interface Project {
  /** @format i32 */
  id: number;
  /** Owner address */
  owner: string;
  /** Project metadata */
  metadata: string;
  is_actived: boolean;
  /** create timestamp */
  created_at: string;
  /** update timestamp */
  updated_at: string;
  ptype: number;
}

export interface Deployment {
  /** @format i32 */
  id: number;
  /** @format i32 */
  project_id: number;
  /** deployment hash */
  deployment: string;
  /** metadata hash */
  metadata: string;
  is_actived: boolean;
  is_latest: boolean;
  /** create timestamp */
  created_at: string;
  /** update timestamp */
  updated_at: string;
}

export interface DeploymentIndexer {
  /** @format i32 */
  id?: number;
  /** @format i32 */
  deployment_id?: number;
  /** @format i32 */
  indexer_id?: number;
  indexer?: string;
  price?: string;
  /** @format i32 */
  max_time?: number;
  block_height?: string;
  /** @format i16 */
  status?: number;
  /** status update timestamp */
  status_at?: string;
  /** @format i32 */
  score?: number;
  /** @format i32 */
  reality?: number;
  is_actived?: boolean;
  /** create timestamp */
  created_at?: string;
  /** update timestamp */
  updated_at?: string;
}

export interface ProjectDetail {
  project?: Project;
  deployment?: Deployment;
  indexers?: DeploymentIndexer[];
}

export interface OpenChannel {
  /**
   * deployment indexer id
   * @format i32
   */
  deployment_indexer?: number;
  /** u256 string */
  amount?: string;
  /**
   * seconds
   * @format i32
   */
  expiration?: number;
  /** signature string, if approved, set empty */
  signature?: string;
}

export interface StateChannel {
  /** @format i32 */
  id?: number;
  /** @format i32 */
  user_id?: number;
  /** @format i32 */
  indexer_id?: number;
  /** @format i16 */
  status?: number;
  channel?: string;
  total?: string;
  spent?: string;
  onchain?: string;
  price?: string;
  is_final?: boolean;
  indexer_sign?: string;
  consumer_sign?: string;
  /** expired timestamp */
  expired_at?: string;
  /** terminated timestamp */
  terminated_at?: string;
  terminate_by_indexer?: boolean;
  deployment?: string;
  is_actived?: boolean;
  /** create timestamp */
  created_at?: string;
  /** update timestamp */
  updated_at?: string;
}

export interface Fund {
  amount?: string;
  callback?: string;
}

/** transaction hash */
export type TX = string;

export interface NewApiKey {
  /** Apikey name */
  name: string;
}

export interface Apikey {
  /** @format i32 */
  id: number;
  /** @format i32 */
  user_id: number;
  name: string;
  value: string;
  /** @format i32 */
  times: number;
  /** create timestamp */
  created_at: string;
  /** update timestamp */
  updated_at: string;
}

export interface HostingPlan {
  /** @format i32 */
  id: number;
  /** @format i32 */
  user_id: number;
  /** @format i32 */
  deployment_id: number;
  channels: string;
  closed: string;
  /** @format i32 */
  maximum: number;
  price: string;
  spent: string;
  expired_at: string;
  is_actived: boolean;
  created_at: string;
  updated_at: string;
}

export interface HostingPlanList {
  /** @format i32 */
  id: number;
  /** @format i32 */
  user_id: number;
  /** @format i32 */
  deployment_id: number;
  channels: string;
  closed: string;
  /** @format i32 */
  maximum: number;
  price: string;
  spent: string;
  expired_at: string;
  is_actived: boolean;
  created_at: string;
  updated_at: string;
  deployment: Deployment;
  project: Project;
}

export interface CreateHostingPlan {
  /** @format i32 */
  deployment?: number;
  deploymentId?: string;
  price: string;
}

export interface UpdateHostingPlan {
  price: string;
  /** @format i32 */
  expiration: number;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, 'body' | 'bodyUsed'>;

export interface FullRequestParams extends Omit<RequestInit, 'body'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, 'baseUrl' | 'cancelToken' | 'signal'>;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = 'application/json',
  JsonApi = 'application/vnd.api+json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = 'https://localhost:8000';
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: 'same-origin',
    headers: {},
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === 'number' ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join('&');
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter((key) => 'undefined' !== typeof query[key]);
    return keys
      .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
      .join('&');
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : '';
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string') ? JSON.stringify(input) : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string') ? JSON.stringify(input) : input,
    [ContentType.Text]: (input: any) => (input !== null && typeof input !== 'string' ? JSON.stringify(input) : input),
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === 'object' && property !== null
              ? JSON.stringify(property)
              : `${property}`
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(`${baseUrl || this.baseUrl || ''}${path}${queryString ? `?${queryString}` : ''}`, {
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type && type !== ContentType.FormData ? {'Content-Type': type} : {}),
      },
      signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
      body: typeof body === 'undefined' || body === null ? null : payloadFormatter(body),
    }).then(async (response) => {
      const r = response.clone() as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title Subquery Consumer Host Service
 * @version 1.0.0
 * @license Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0.html)
 * @baseUrl https://localhost:8000
 *
 * API Docs for Subquery Consumer Host Service
 */
export class NetworkConsumerHostServiceApi<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  login = {
    /**
     * No description
     *
     * @tags general
     * @name AuthControllerUserToken
     * @summary User login to get token
     * @request POST:/login
     */
    authControllerUserToken: (body: Payload, params: RequestParams = {}) =>
      this.request<QueryToken, any>({
        path: `/login`,
        method: 'POST',
        body: body,
        type: ContentType.Json,
        ...params,
      }),
  };
  query = {
    /**
     * @description Returns the result of the query
     *
     * @tags general
     * @name QueryControllerQuery
     * @summary Consumer send query
     * @request POST:/query/{project}
     */
    queryControllerQuery: (
      project: number,
      body: {
        /** apikey for query */
        apikey: string;
      },
      params: RequestParams = {}
    ) =>
      this.request<any, void>({
        path: `/query/${project}`,
        method: 'POST',
        body: body,
        type: ContentType.FormData,
        ...params,
      }),
  };
  sign = {
    /**
     * @description Returns the state channel info
     *
     * @tags general
     * @name QueryControllerSign
     * @summary Consumer sign to open state channel
     * @request POST:/sign/{project}
     */
    queryControllerSign: (
      project: number,
      data: {
        /** apikey for query */
        apikey: string;
      },
      params: RequestParams = {}
    ) =>
      this.request<QueryState, void>({
        path: `/sign/${project}`,
        method: 'POST',
        body: data,
        type: ContentType.FormData,
        ...params,
      }),
  };
  projects = {
    /**
     * No description
     *
     * @tags general
     * @name ProjectControllerIndex
     * @summary Get all projects
     * @request GET:/projects
     */
    projectControllerIndex: (params: RequestParams = {}) =>
      this.request<Project[], any>({
        path: `/projects`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags general
     * @name ProjectControllerShow
     * @summary Get the project by id
     * @request GET:/projects/{id}
     */
    projectControllerShow: (id: number, params: RequestParams = {}) =>
      this.request<ProjectDetail, any>({
        path: `/projects/${id}`,
        method: 'GET',
        ...params,
      }),
  };
  users = {
    /**
     * No description
     *
     * @tags user
     * @name UserControllerApikeyIndex
     * @summary Get all apikeys of a user
     * @request GET:/users/apikeys
     * @secure
     */
    userControllerApikeyIndex: (params: RequestParams = {}) =>
      this.request<Apikey[], any>({
        path: `/users/apikeys`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name UserControllerApikeyCreate
     * @summary Generate an Apikey for user
     * @request POST:/users/apikeys/new
     * @secure
     */
    userControllerApikeyCreate: (body: NewApiKey, params: RequestParams = {}) =>
      this.request<Apikey, any>({
        path: `/users/apikeys/new`,
        method: 'POST',
        body: body,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name UserControllerApikeyRemove
     * @summary Delete an Apikey for user
     * @request POST:/users/apikeys/{id}/delete
     * @secure
     */
    userControllerApikeyRemove: (id: number, params: RequestParams = {}) =>
      this.request<Apikey, void>({
        path: `/users/apikeys/${id}/delete`,
        method: 'POST',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name HostingPlanControllerIndex
     * @summary Get all hosting plans of a user
     * @request GET:/users/hosting-plans
     * @secure
     */
    hostingPlanControllerIndex: (params: RequestParams = {}) =>
      this.request<HostingPlanList[], any>({
        path: `/users/hosting-plans`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name HostingPlanControllerCreate
     * @summary Create a new hosting plan for user
     * @request POST:/users/hosting-plans
     * @secure
     */
    hostingPlanControllerCreate: (body: CreateHostingPlan, params: RequestParams = {}) =>
      this.request<HostingPlan, any>({
        path: `/users/hosting-plans`,
        method: 'POST',
        body: body,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name HostingPlanControllerEdit
     * @summary Update a hosting plan for user
     * @request POST:/users/hosting-plans/{id}
     * @secure
     */
    hostingPlanControllerEdit: (id: number, body: UpdateHostingPlan, params: RequestParams = {}) =>
      this.request<HostingPlan, any>({
        path: `/users/hosting-plans/${id}`,
        method: 'POST',
        body: body,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
}
