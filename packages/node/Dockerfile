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
RUN apk add --no-cache tini curl git && \
    tar -xzvf /app.tgz --strip 1 && \
    rm /app.tgz && \
    yarn install --production && \
    yarn cache clean && \
    rm -rf /root/.npm /root/.cache

# Create ./.monitor directory and set permissions
RUN mkdir -p .monitor && \
    chown 1000:1000 .monitor

# Make the user not ROOT
USER 1000
# Fix timezone to UTC
ENV TZ=utc

# Set Entry point and command
ENTRYPOINT ["/sbin/tini", "--", "/bin/run"]
CMD ["-f","/app"]
