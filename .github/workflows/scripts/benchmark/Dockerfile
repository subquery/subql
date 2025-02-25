FROM node:lts-alpine

# Define build-time arguments

ARG input_indexer_version
ENV INDEXER_VERSION=${input_indexer_version}

ENV DB_USER=postgres
ENV DB_PASS=postgres
ENV DB_DATABASE=postgres
ENV DB_HOST=postgres
ENV DB_PORT=5432

# Set the working directory in the container
WORKDIR /app

# Install app dependencies
RUN npm i @subql/node-ethereum@$INDEXER_VERSION -g

# Copy the rest of the app's code to the container
COPY . .

# Custom script to run the Node.js app and handle other tasks
COPY benchmarking.sh /app/benchmarking.sh
RUN chmod +x /app/benchmarking.sh


ENV TZ=utc

# Set the entrypoint to the script
ENTRYPOINT ["/bin/bash", "/app/benchmarking.sh"]
