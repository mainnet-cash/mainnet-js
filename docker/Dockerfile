FROM debian:buster-slim

RUN groupadd -r bitcoin && useradd -r -m -g bitcoin bitcoin
RUN groupadd -r fulcrum && useradd -r -m -g fulcrum fulcrum

RUN set -ex \
	&& apt-get update \
	&& apt-get install -qq --no-install-recommends ca-certificates dirmngr gosu wget \
	&& rm -rf /var/lib/apt/lists/*

ENV BITCOIN_VERSION 22.0.0
ENV BITCOIN_URL https://github.com/bitcoin-cash-node/bitcoin-cash-node/releases/download/v22.0.0/bitcoin-cash-node-22.0.0-x86_64-linux-gnu.tar.gz
ENV BITCOIN_SHA256 6487d3778e0e3319957553763d9e9d4420a46590636ffc63778a5e40e4e69ef5

# install bitcoin binaries
RUN set -ex \
	&& cd /tmp \
	&& wget -qO bitcoin.tar.gz "$BITCOIN_URL" \
	&& echo "$BITCOIN_SHA256 bitcoin.tar.gz" | sha256sum -c - \
	&& tar -xzvf bitcoin.tar.gz -C /usr/local --strip-components=1 --exclude=*-qt \
	&& rm -rf /tmp/*

# create data directory
ENV BITCOIN_DATA /data
RUN mkdir "$BITCOIN_DATA" \
	&& chown -R bitcoin:bitcoin "$BITCOIN_DATA" \
	&& ln -sfn "$BITCOIN_DATA" /home/bitcoin/.bitcoin \
	&& chown -h bitcoin:bitcoin /home/bitcoin/.bitcoin
VOLUME /data


RUN wget https://github.com/cculianu/Fulcrum/releases/download/v1.2.10/Fulcrum-1.2.10-x86_64-linux.tar.gz 
RUN mkdir -p /opt/fulcrum
RUN ls /opt/fulcrum
RUN tar -xvf Fulcrum-1.2.10-x86_64-linux.tar.gz -C /opt/fulcrum
RUN ls /opt/fulcrum

VOLUME ["/data"]
ENV DATA_DIR /opt/fulcrum/data


EXPOSE 60003 
EXPOSE 18443

# COPY ./entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]



COPY fulcrum.conf /opt/fulcrum/fulcrum.conf

COPY bitcoind.service /etc/systemd/system/bitcoind.service
COPY fulcrum.service /etc/systemd/system/fulcrum.service
#RUN systemctl daemon-reload
#RUN systemctl enable bitcoin
#RUN systemctl enable fulcrum
CMD ["bash"]