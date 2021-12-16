# production images
FROM node:16 as builder
ARG RELEASE_VERSION
RUN npm i -g --unsafe-perm @subql/query@${RELEASE_VERSION}

FROM node:16-alpine
ENV TZ utc

RUN apk add --no-cache tini
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/lib/node_modules/@subql/query/bin/run"]
CMD ["-f","/app"]
