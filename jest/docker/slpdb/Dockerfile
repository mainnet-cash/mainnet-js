# A Docker container for running SLPDB. Updated images will be uploaded
# to Docker Hub:
# https://cloud.docker.com/u/christroutner/repository/docker/christroutner/slpdb-mainnet_slpdb

## BEGIN BOILERPLATE SETUP

FROM node:12-buster-slim

# Update the OS and install any OS packages needed.
RUN apt-get update -y
RUN apt-get install -y git autoconf libtool python3 build-essential

# Clone the SLPDB repository
WORKDIR /home/safeuser
RUN git clone https://github.com/christroutner/SLPDB
#RUN git clone https://github.com/simpleledger/SLPDB

# Checkout the last QA'd version.
WORKDIR /home/safeuser/SLPDB
#RUN git checkout f1f48a3b7a852e24fd26b3baf6df65b47de6d89e
#RUN git checkout 9a85b1bd381a82e6d2094d6936774ee5a4503de3
RUN git checkout ct-unstable

# Install dependencies.
RUN npm install

# Call out the persistant volumes
VOLUME /home/safeuser/SLPDB/_leveldb
VOLUME /home/safeuser/config

COPY run-script.sh run-script.sh
COPY startup-script.sh startup-script.sh
RUN chmod 777 startup-script.sh
CMD ["./startup-script.sh"]