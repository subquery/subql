# production images
FROM node:16 as builder
ARG RELEASE_VERSION
ENTRYPOINT ["subql-node-avalanche"]
RUN npm i -g --unsafe-perm @subql/node-avalanche@${RELEASE_VERSION}

FROM node:16-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/lib/node_modules/@subql/node-avalanche/bin/run"]
CMD ["-f","/app"]
