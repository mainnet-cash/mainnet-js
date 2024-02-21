# Dockerfile to produce mainnet/mainnet-rest image

ARG BASE_IMAGE=node:14.21.3
FROM $BASE_IMAGE

ARG GIT_REPO=https://github.com/mainnet-cash/mainnet-js
ARG GIT_COMMIT=059cb41626aec04440d7657633e5e2ff61879ed0

ARG MAINNET_TAG=1.1.16

RUN set -ex \
  && apt-get update \
  && apt-get install -y --no-install-recommends --no-install-suggests \
     letsencrypt nginx supervisor cron vim gettext \
  && rm -rf /var/lib/apt/lists/* \
  && cd opt \
  && git clone ${GIT_REPO} mainnet-js \
  && cd mainnet-js && git checkout ${GIT_COMMIT} && rm -rf .git \
  && yarn && yarn build:production \
  && yarn install --production --ignore-scripts && yarn patch-package \
  && yarn workspace mainnet-cash install --production \
  && rm -rf /usr/local/share/.cache/ /opt/mainnet-js/jest/playwright/ /root/.cache
COPY ./entrypoint.sh ./http.conf ./https.conf ./https.le.conf.tpl ./supervisor.conf /opt/

CMD /bin/bash /opt/entrypoint.sh
