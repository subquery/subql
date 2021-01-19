FROM node:12 as builder
WORKDIR /workdir

COPY . .
RUN yarn install

RUN yarn workspace @subql/query build

# production images
FROM node:12-alpine
ENV TZ utc

COPY --from=builder /workdir /workdir

WORKDIR /workdir/packages/query

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--", "node", "./dist/main.js"]
CMD ["-s","public"]
