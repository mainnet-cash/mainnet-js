FROM ubuntu:18.04

ENV TZ=Europe/London
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update

# Install requirements for node-gyp
USER root
WORKDIR /
RUN apt-get install -y python3 make gcc g++

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

# Run yarn
USER appuser
WORKDIR /app/
COPY package.json /app/
COPY yarn.lock /app/
RUN yarn

## Copy the rest of the application
USER appuser
COPY --chown=appuser:appuser . /app/

RUN yarn

CMD bash -lc "echo $WORKERS workers will be run; npm run serve:cluster"
