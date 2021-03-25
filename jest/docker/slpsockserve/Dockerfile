FROM christroutner/ct-base-ubuntu

RUN apt-get update -y

RUN apt-get install -y autoconf libtool

#Set the working directory to be the home directory
WORKDIR /home/safeuser

# Switch to user account.
USER safeuser
# Prep 'sudo' commands.
#RUN echo 'abcd8765' | sudo -S pwd

# Clone the Bitcore repository
WORKDIR /home/safeuser
RUN git clone https://github.com/fountainhead-cash/slpsockserve
WORKDIR /home/safeuser/slpsockserve
RUN npm install
COPY env .env

CMD ["npm", "start"]
