# production images
FROM node:16 as builder
ARG RELEASE_VERSION
ENTRYPOINT ["subql-node"]
RUN npm i -g --unsafe-perm @subql/node@${RELEASE_VERSION}

FROM node:16-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl jq
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/lib/node_modules/@subql/node/bin/run"]
CMD ["-f","/app"]
