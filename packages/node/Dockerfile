# production images
FROM node:18 as builder

ENTRYPOINT ["subql-node"]
RUN npm install -g --force yarn@latest

WORKDIR /app
COPY . .

# Install dependencies
RUN yarn install

# Install TypeScript globally
#RUN npm install -g typescript

# Build the application
#RUN yarn build

FROM node:18-alpine
ENV TZ utc

RUN apk add --no-cache tini git curl
# Copy the built application from the previous stage
COPY --from=builder /app .

# Adjust the ENTRYPOINT to the location of your application's start script
ENTRYPOINT ["/sbin/tini", "--", "node", "bin/run"]
CMD ["-f","/app"]