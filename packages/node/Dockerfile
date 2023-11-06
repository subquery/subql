# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy all packages
COPY ./packages ./packages

# Copy tsconfig.json
COPY ./tsconfig.json ./tsconfig.json

# Install dependencies and build
RUN apk add --no-cache jq && \
    npm install -g --force yarn@latest && \
    cd packages/node && \
    jq -r '.dependencies | to_entries[] | select(.value == "workspace:*") | .key' package.json | while read -r dep; do \
      echo "Dep: $dep"; \
      cat ../../tsconfig.json; \
      directory=$(jq --arg dep $dep -r '.compilerOptions.paths[$dep][0]' ../../tsconfig.json | cut -d'/' -f 2); \
      echo "Directory: $directory"; \
      version=$(jq --arg directory $directory -r '.version' ../$directory/package.json); \
      if [ "$version" != null ]; then \
        jq --arg dep $dep --arg version $version -r '.dependencies[$dep] = $version' package.json > package.tmp.json && mv package.tmp.json package.json; \
      fi; \
    done && \
    yarn pack --filename app.tgz && \
    rm -rf /root/.npm /root/.cache

# Production stage
FROM node:18-alpine

# Copy .tgz file from builder
COPY --from=builder /app/packages/node/app.tgz /app.tgz

# Install production dependencies
RUN apk add --no-cache tini curl git && \
    tar -xzvf /app.tgz --strip 1 && \
    rm /app.tgz && \
    yarn install --production && \
    yarn cache clean && \
    rm -rf /root/.npm /root/.cache

# Set Entry point and command
ENTRYPOINT ["/sbin/tini", "--", "bin/run"]
CMD ["-f","/app"]