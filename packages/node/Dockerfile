# production images
FROM node:18 as builder
ARG RELEASE_VERSION
ENTRYPOINT ["subql-node-soroban"]
RUN npm i -g --unsafe-perm @subql/node-soroban@${RELEASE_VERSION}

FROM node:18-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/lib/node_modules/@subql/node-soroban/bin/run"]
CMD ["-f","/app"]
