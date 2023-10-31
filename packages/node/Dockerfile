# Build stage
FROM node:18 as builder

WORKDIR /app
COPY ./ ./

RUN npm install -g --force yarn@latest

RUN yarn install
RUN yarn build

WORKDIR /app/packages/node

RUN yarn pack --filename ./app.tgz


# Production stage
FROM node:18-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl tar

COPY --from=builder /app/packages/node/app.tgz /app.tgz
RUN tar -xzvf /app.tgz --strip 1 && rm /app.tgz

RUN yarn install --production

ENTRYPOINT ["/sbin/tini", "--", "bin/run"]
CMD ["-f","/app"]