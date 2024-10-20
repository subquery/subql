FROM node:lts-bullseye
WORKDIR /workdir

# Fix timezone to UTC
ENV TZ=utc

COPY . .
RUN yarn
