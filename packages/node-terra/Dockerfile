# production images
FROM node:14 as builder
ARG RELEASE_VERSION
ENTRYPOINT ["subql-node-terra"]
RUN npm i -g --unsafe-perm @subql/node-terra@${RELEASE_VERSION}

FROM node:14-alpine
ENV TZ utc

RUN apk add --no-cache tini git
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/lib/node_modules/@subql/node-terra/bin/run"]
CMD ["-f","/app"]
