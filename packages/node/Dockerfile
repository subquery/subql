# Build stage
FROM node:18 as builder

WORKDIR /app
COPY ./packages/node .

RUN npm install -g --force yarn@latest
RUN yarn install


# Production stage
FROM node:18-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl

COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin

ENTRYPOINT ["/sbin/tini", "--", "node", "bin/run"]
CMD ["-f","/app"]