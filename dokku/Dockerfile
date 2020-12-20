FROM ubuntu:18.04

ENV TZ=Europe/London
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update

# Install requirements for libpq
USER root
WORKDIR /
RUN apt-get update && apt-get install -y --fix-missing postgresql postgresql-client libpq-dev make gcc g++ 

# Install Node and yarn
USER root
WORKDIR /
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get update && apt-get install -y nodejs
RUN npm install -g yarn

# Add user and directory
# 32767 is dokku's user
RUN groupadd --gid 32767 appuser
RUN useradd --create-home --uid 32767 --gid 32767 --shell /bin/bash appuser
RUN mkdir /app/
RUN chown -R appuser:appuser /app/

# Run npm
USER appuser
WORKDIR /app/
COPY --chown=appuser:appuser . /app/
RUN yarn install --only=production
RUN yarn build 
RUN yarn api:serve:install

CMD bash -lc "echo $WORKERS workers will be run; yarn api:serve:cluster"
