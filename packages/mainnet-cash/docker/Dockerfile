# Dockerfile to produce mainnet/mainnet-rest image

ARG BASE_IMAGE=node:14.15.0
FROM $BASE_IMAGE

ARG GIT_REPO=https://github.com/mainnet-cash/mainnet-js
ARG GIT_COMMIT=b0b32be3bffad611e83ea1242bc312b7df0862d3

ARG MAINNET_TAG=0.5.9

RUN set -ex \
  && apt-get update \
  && apt-get install -y --no-install-recommends --no-install-suggests \
     letsencrypt nginx supervisor cron vim gettext \
  && cd opt \
  && git clone ${GIT_REPO} mainnet-js \
  && cd mainnet-js && git checkout ${GIT_COMMIT} \
  && yarn install --production --ignore-scripts && yarn patch-package \
  && yarn workspace mainnet-cash install --production \
  && yarn workspace mainnet-cash add \
    mainnet-js@${MAINNET_TAG} \
    @mainnet-cash/contract@${MAINNET_TAG} \
    @mainnet-cash/smartbch@${MAINNET_TAG}

COPY ./entrypoint.sh ./http.conf ./https.conf ./https.le.conf.tpl ./supervisor.conf /opt/

CMD /bin/bash /opt/entrypoint.sh
