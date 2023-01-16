FROM debian:stretch-slim

ARG TARGETPLATFORM

RUN groupadd -r bitcoin && useradd -r -m -g bitcoin bitcoin

RUN set -ex \
  && apt-get update \
  && apt-get install -qq --no-install-recommends ca-certificates dirmngr gosu gpg wget \
  && rm -rf /var/lib/apt/lists/*

ENV BITCOIN_VERSION 26.0.0

# install bitcoin binaries
RUN set -ex \
  && [ $TARGETPLATFORM = "linux/arm64" ] && platform="aarch64-linux-gnu" || platform="x86_64-linux-gnu" \
  # && export BITCOIN_URL=https://github.com/bitcoin-cash-node/bitcoin-cash-node/releases/download/v${BITCOIN_VERSION}/bitcoin-cash-node-${BITCOIN_VERSION}-${platform}.tar.gz \
  && export BITCOIN_URL=https://download.bitcoincashnode.org/releases/v${BITCOIN_VERSION}/linux/bitcoin-cash-node-${BITCOIN_VERSION}-${platform}.tar.gz \
  && [ $TARGETPLATFORM = "linux/arm64" ] && sha256="42d634c555e40fa8caea0469a0859f980a407151a4d41dfcd9f20a63243415db" || sha256="e32e05fd63161f6f1fe717fca789448d2ee48e2017d3d4c6686b4222fe69497e" \
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