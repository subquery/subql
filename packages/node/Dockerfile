# Build stage
FROM node:18 as builder

WORKDIR /app
COPY ./ ./

# Copy the replace-versions.sh script
COPY ./.github/workflows/scripts/replace-versions.sh ./replace-versions.sh

RUN npm install -g --force yarn@latest
RUN npm install -g --force typescript@latest

# Run the replace-versions.sh script
RUN chmod +x ./replace-versions.sh
RUN ./replace-versions.sh

WORKDIR /app/packages/node

# Run yarn install and yarn build in the packages/node directory
RUN yarn install
RUN yarn build

RUN yarn pack --filename app.tgz

# Production stage
FROM node:18-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl tar

COPY --from=builder /app/packages/node/app.tgz /app.tgz

RUN tar -xzvf /app.tgz --strip 1 && rm /app.tgz

RUN yarn install --production --non-interactive --pure-lockfile --prefer-offline
RUN yarn cache clean

ENTRYPOINT ["/sbin/tini", "--", "bin/run"]
CMD ["-f","/app"]