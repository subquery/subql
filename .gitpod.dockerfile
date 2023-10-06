FROM gitpod/workspace-full

RUN sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
RUN sudo apt-get update
RUN sudo apt-get -y install postgresql-16

# Variables needed at runtime to configure postgres
ENV POSTGRES_DB 'postgres'
ENV POSTGRES_USER 'postgres'
ENV POSTGRES_PASSWORD 'postgres'
