FROM node:14 as builder
WORKDIR /workdir



COPY . .
RUN yarn install


RUN yarn workspace @subql/node build

# production images
FROM node:14-alpine
ENV TZ utc

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--", "node", "./dist/main.js"]

WORKDIR /workdir
COPY --from=builder /workdir .


WORKDIR /workdir/packages/node
CMD ["-f","/app"]
