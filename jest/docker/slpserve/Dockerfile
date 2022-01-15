FROM node:12-buster-slim

# Update the OS and install any OS packages needed.
RUN apt-get update -y
RUN apt-get install -y git autoconf libtool python3 build-essential

# Clone the Bitcore repository
WORKDIR /home/safeuser
# RUN git clone https://github.com/christroutner/slpserve
RUN git clone https://github.com/fountainhead-cash/slpserve
WORKDIR /home/safeuser/slpserve
RUN npm install
COPY env .env

CMD ["npm", "start"]
