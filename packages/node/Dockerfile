# Build stage
FROM node:18 as builder

WORKDIR /app
COPY . .

RUN npm install -g --force yarn@latest
RUN yarn install
# Uncomment the following line if you need to build your application
# RUN yarn build

# Production stage
FROM node:18-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl

COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
# Copy your built files (replace 'dist' with your directory if it's different)
COPY --from=builder /app/dist ./dist
# Copy the bin directory
COPY --from=builder /app/bin ./bin

ENTRYPOINT ["/sbin/tini", "--", "node", "bin/run"]
CMD ["-f","/app"]