
# production images
FROM node:14-alpine
ENV TZ utc

ARG RELEASE_VERSION
RUN apk add --no-cache tini git
ENTRYPOINT ["/sbin/tini", "--", "subql-node"]

RUN npm i -g @subql/node@${RELEASE_VERSION}
WORKDIR /workdir

CMD ["-f","/app"]
