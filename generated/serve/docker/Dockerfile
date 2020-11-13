# Dockerfile to produce mainnet/mainnet-rest image

ARG BASE_IMAGE=node:14.15.0
FROM $BASE_IMAGE

RUN apt-get update \
  && apt-get install -y --no-install-recommends --no-install-suggests \
     letsencrypt nginx supervisor cron vim gettext \
  && cd opt \
  && git clone https://github.com/mainnet-cash/mainnet-js \
  && cd mainnet-js \
  && yarn && npm run build && rm -rf node_modules dist \
  && cd generated/serve \
  && npm install

COPY ./entrypoint.sh ./http.conf ./https.conf ./https.le.conf.tpl ./supervisor.conf /opt/

CMD /bin/bash /opt/entrypoint.sh
