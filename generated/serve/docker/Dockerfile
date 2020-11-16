# Dockerfile to produce mainnet/mainnet-rest image

ARG BASE_IMAGE=node:14.15.0
FROM $BASE_IMAGE

ARG GIT_REPO=https://github.com/mainnet-cash/mainnet-js
ARG GIT_COMMIT=master

RUN apt-get update \
  && apt-get install -y --no-install-recommends --no-install-suggests \
     letsencrypt nginx supervisor cron vim gettext \
  && cd opt \
  && git clone ${GIT_REPO} mainnet-js \
  && cd mainnet-js && git checkout $GIT_COMMIT \
  && yarn && npm run build && rm -rf node_modules dist \
  && cd generated/serve \
  && npm install

COPY ./entrypoint.sh ./http.conf ./https.conf ./https.le.conf.tpl ./supervisor.conf /opt/

CMD /bin/bash /opt/entrypoint.sh
