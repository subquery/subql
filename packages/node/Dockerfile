# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY ./packages/node ./
RUN npm install -g --force yarn@latest && \
    yarn pack --filename app.tgz && \
    rm -rf /root/.npm /root/.cache

# Production stage
FROM node:18-alpine
RUN apk add --no-cache tini curl git
COPY --from=builder /app/app.tgz /app.tgz
RUN tar -xzvf /app.tgz --strip 1 && \
    rm /app.tgz && \
    yarn install --production && \
    yarn cache clean && \
    rm -rf /root/.npm /root/.cache
ENTRYPOINT ["/sbin/tini", "--", "bin/run"]
CMD ["-f","/app"]