FROM node:12-buster-slim

RUN apt-get update -y

RUN apt-get install -y autoconf libtool git python3 build-essential

WORKDIR /home/safeuser

RUN git clone https://github.com/fountainhead-cash/slpsockserve
WORKDIR /home/safeuser/slpsockserve
RUN npm install
COPY env .env

CMD ["npm", "start"]
