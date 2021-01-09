FROM node:12 as builder
WORKDIR /workdir



COPY . .
RUN yarn install


RUN yarn workspace @subql/node build

# production images
FROM node:12-alpine
ENV TZ utc

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--", "node", "./dist/main.js"]

WORKDIR /workdir
COPY --from=builder /workdir .


WORKDIR /workdir/packages/node
CMD ["-f","/app"]
