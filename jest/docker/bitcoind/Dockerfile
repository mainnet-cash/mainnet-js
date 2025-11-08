FROM debian:trixie-slim

ARG TARGETPLATFORM

RUN groupadd -r bitcoin && useradd -r -m -g bitcoin bitcoin

RUN set -ex \
  && apt-get update \
  && apt-get install -qq --no-install-recommends ca-certificates dirmngr gosu gpg wget \
  && rm -rf /var/lib/apt/lists/*

ENV BITCOIN_VERSION=28.0.2

# install bitcoin binaries
RUN set -ex \
  && [ $TARGETPLATFORM = "linux/arm64" ] && platform="aarch64-linux-gnu" || platform="x86_64-linux-gnu" \
  # && export BITCOIN_URL=https://github.com/bitcoin-cash-node/bitcoin-cash-node/releases/download/v${BITCOIN_VERSION}/bitcoin-cash-node-${BITCOIN_VERSION}-${platform}.tar.gz \
  && export BITCOIN_URL=https://download.bitcoincashnode.org/misc/builds/upgrade12_temp/linux/bitcoin-cash-node-${BITCOIN_VERSION}-${platform}.tar.gz \
  && [ $TARGETPLATFORM = "linux/arm64" ] && sha256="ff06d8bec4077c826f7baa0127f38280f5565a87a2c31c05071be79267761723" || sha256="140b44fd76a4f9428354bfbec4800d58fd39fb723320e761a035f15c2dd43596" \
  && export BITCOIN_SHA256="$sha256" \
  && echo "$TARGETPLATFORM" "$BITCOIN_SHA256" "$BITCOIN_URL" \
  && cd /tmp \
  && wget -q --show-progress -O bitcoin.tar.gz "$BITCOIN_URL" \
  && echo "$BITCOIN_SHA256 bitcoin.tar.gz" | sha256sum -c - \
  && tar -xzvf bitcoin.tar.gz -C /usr/local --strip-components=1 --exclude=*-qt \
  && rm -rf /tmp/*

# create data directory
ENV BITCOIN_DATA=/data
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