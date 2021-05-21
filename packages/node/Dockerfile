
# production images
FROM node:14-alpine
RUN apk add git
ENV TZ utc

ARG RELEASE_VERSION
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--", "subql-node"]

RUN npm i -g @subql/node@${RELEASE_VERSION}
WORKDIR /workdir

CMD ["-f","/app"]
