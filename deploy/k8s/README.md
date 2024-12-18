# K8s Deploy
This [deploy.yaml](deploy.yaml) demonstrate how to run subquery in k8s.

You will need to run 
### 1. a subql-node to index data
```yaml
apiVersion: apps/v1
kind: Deployment

metadata:
  name: subql-node-1
  labels:
    app: subql-node
    release: subql-node-1

spec:
  selector:
    matchLabels:
      release: subql-node-1
  replicas: 1
  template:
    metadata:
      labels:
        release: subql-node-1
    spec:
      volumes:
        - name: project-dir
          emptyDir:
            medium: Memory
      initContainers:
        - name: prepare
          imagePullPolicy: IfNotPresent
          image: node:18-alpine
          command:
            - sh
            - -c
            - apk add git && git clone https://github.com/OnFinality-io/subql-examples /subquery && cd /subquery/block-timestamp && npm i -g @subql/cli && yarn && subql codegen && yarn build
          volumeMounts:
            - name: project-dir
              mountPath: '/subquery'
      containers:
        - name: indexer
          imagePullPolicy: IfNotPresent
          image: onfinality/subql-node:v0.4.0
          args:
            - -f
            - /subquery/block-timestamp
            - --local
          env:
            - name: DB_HOST
              value: subquery-db-svc
            - name: DB_PORT
              value: "5432"
            - name: DB_USER
              value: postgres
            - name: DB_PASS
              value: postgres
            - name: DB_DATABASE
              value: postgres
          volumeMounts:
            - name: project-dir
              mountPath: '/subquery'
          securityContext:
            runAsUser: 1000

      securityContext:
        fsGroup: 1000
      imagePullSecrets:
        - name: regcred
```
Note: `--local` will create subquery tables in public schema, if you want to store multiple subquery in the same db, remove that flag.

#### 2. a Postgres Database
```yaml
apiVersion: apps/v1
kind: StatefulSet

metadata:
  name: subquery-db
  labels:
    app: postgres
    release: subquery-db

spec:
  serviceName: subquery-db-svc

  selector:
    matchLabels:
      release: subquery-db

  volumeClaimTemplates:
    - metadata:
        name: subquery-db-pvc
        annotations:
          volume.beta.kubernetes.io/storage-class: standard
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 20G
  template:
    metadata:
      labels:
        release: subquery-db
    spec:
      containers:
        - name: db
          imagePullPolicy: IfNotPresent
          image: postgres:12-alpine
          env:
            - name: POSTGRES_PASSWORD
              value: postgres
          ports:
            - containerPort: 5432
          volumeMounts:
            - mountPath: /var/lib/postgresql
              name: subquery-db-pvc

      securityContext:
        fsGroup: 1000
      imagePullSecrets:
        - name: regcred
---
apiVersion: v1
kind: Service

metadata:
  name: subquery-db-svc

spec:
  clusterIP: None
  ports:
    - port: 5432
  selector:
    release: subquery-db
```

Note that if used in production, a dedicated database should be used to get better performance.

#### 3. Hasura for graphql querying
```yaml
apiVersion: apps/v1
kind: Deployment

metadata:
  name: hasura-deploy
  labels:
    release: hasura

spec:
  selector:
    matchLabels:
      release: hasura
  replicas: 1

  template:
    metadata:
      labels:
        release: hasura
    spec:
      containers:
        - name: hasura
          image: hasura/graphql-engine:v1.3.3
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          env:
            # HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:postgres@postgres:5432/postgres
            #      ## enable the console served by server
            #      HASURA_GRAPHQL_ENABLE_CONSOLE: "true" # set to "false" to disable console
            #      ## enable debugging mode. It is recommended to disable this in production
            #      HASURA_GRAPHQL_DEV_MODE: "true"
            #      HASURA_GRAPHQL_ENABLED_LOG_TYPES: startup, http-log, webhook-log, websocket-log, query-log
            - name: HASURA_GRAPHQL_DATABASE_URL
              value: postgres://postgres:postgres@subquery-db-svc:5432/postgres
            - name: HASURA_GRAPHQL_ENABLE_CONSOLE
              value: 'true'
      terminationGracePeriodSeconds: 300
```

To gain further security, an archive node should be used in the same k8s cluster, and a NetworkPolicy be added to limit all network communication within the internal network.
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: subquery-node-egress
spec:
  podSelector:
    matchLabels:
      release: subql-node-1
  egress:
    - to:
        - ipBlock:
            cidr: 10.0.0.0/8
  policyTypes:
    - Egress
```
