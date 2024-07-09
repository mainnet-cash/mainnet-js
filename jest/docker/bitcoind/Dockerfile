FROM debian:buster-slim

ARG TARGETPLATFORM

RUN groupadd -r bitcoin && useradd -r -m -g bitcoin bitcoin

RUN set -ex \
  && apt-get update \
  && apt-get install -qq --no-install-recommends ca-certificates dirmngr gosu gpg wget \
  && rm -rf /var/lib/apt/lists/*

ENV BITCOIN_VERSION 27.0.0

# install bitcoin binaries
RUN set -ex \
  && [ $TARGETPLATFORM = "linux/arm64" ] && platform="aarch64-linux-gnu" || platform="x86_64-linux-gnu" \
  && export BITCOIN_URL=https://download.bitcoincashnode.org/releases/${BITCOIN_VERSION}/linux/bitcoin-cash-node-${BITCOIN_VERSION}-${platform}.tar.gz \
  && [ $TARGETPLATFORM = "linux/arm64" ] && sha256="65307b1b13142defb5d4239a84c53b9f5ce7b7baca6ed8f899782ec7a9be4a72" || sha256="2ab81515a763162435f7ea28bb1f10f69b6143f469278fc52c0b8cbaec6cf238" \
  && export BITCOIN_SHA256="$sha256" \
  && echo "$TARGETPLATFORM" "$BITCOIN_SHA256" "$BITCOIN_URL" \
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

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod 777 /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 8332 8333 18332 18333
CMD ["bitcoind"]