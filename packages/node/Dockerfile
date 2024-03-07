# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy all packages
COPY ./packages ./packages

# Copy tsconfig.json
COPY ./tsconfig.json ./tsconfig.json

# Copy build script
COPY ./scripts/build.sh ./scripts/build.sh

# Install dependencies and build
RUN ./scripts/build.sh packages/node

# Production stage
FROM node:18-alpine

# Copy .tgz file from builder
COPY --from=builder /app/packages/node/app.tgz /app.tgz

# Install production dependencies
RUN apk add --no-cache tini curl git &&  \
    apk add --no-cache python3 make g++ &&  \
    npm install -g node-gyp

# Install the app
RUN npm i -g app.tgz

# Clean up unused deps
RUN rm /app.tgz && \
    yarn cache clean && \
    rm -rf /root/.npm /root/.cache

# Make the user not ROOT
USER 1000

# Set Entry point and command
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/lib/node_modules/@subql/node-stellar/bin/run"]
CMD ["-f","/app"]
