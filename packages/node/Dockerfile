# Build stage
FROM node:18 as builder

WORKDIR /app
COPY ./packages/node ./

RUN npm install -g --force yarn@latest
RUN yarn pack -o /app.tgz


# Production stage
FROM node:18-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl tar

COPY --from=builder /app/*.tgz /app.tgz
RUN tar -xzvf /app.tgz --strip 1 && rm /app.tgz

RUN yarn install

ENTRYPOINT ["/sbin/tini", "--", "node", "bin/run"]
CMD ["-f","/app"]