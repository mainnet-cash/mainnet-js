# Dockerfile to produce mainnet/mainnet-rest image

ARG BASE_IMAGE=node:14.15.0
FROM $BASE_IMAGE

ARG GIT_REPO=https://github.com/mainnet-cash/mainnet-js
ARG GIT_COMMIT=3f6698374c84772b6b759146177706d7b13a6472

ARG MAINNET_TAG=1.0.0-rc.1

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
