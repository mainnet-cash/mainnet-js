#!/usr/bin/env bash

export LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-''}
export DOMAIN=${DOMAIN:-'localhost'}

rm -f /etc/nginx/sites-enabled/* /etc/nginx/sites-available/*
cp /opt/http.conf /etc/nginx/sites-enabled/http.conf

cp /opt/supervisor.conf /etc/supervisor/conf.d/supervisor.conf
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisor.conf &
sleep 1

if [[ -n $LETSENCRYPT_EMAIL ]]; then
  # testing https://acme-staging-v02.api.letsencrypt.org/directory
  # production https://acme-v02.api.letsencrypt.org/directory
  if [[ ! -d /etc/letsencrypt/archive/${DOMAIN} ]]; then
    echo "obtaining ssl certificates from letsencrypt"
    mkdir -p /var/www/letsencrypt/.well-known/acme-challenge/ && \
    certbot certonly --webroot -w /var/www/letsencrypt -d ${DOMAIN} --agree-tos --email ${LETSENCRYPT_EMAIL} --non-interactive --text --server https://acme-v02.api.letsencrypt.org/directory && \
    chmod 640 /etc/letsencrypt/archive/${DOMAIN}/privkey*
  else
    echo "reusing previously obtained ssl certificates from letsencrypt"
  fi
  rm -f /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* && \
  envsubst '${DOMAIN}' < /opt/https.le.conf.tpl > /etc/nginx/sites-enabled/https.le.conf && \
  nginx -s reload && \
  echo "mainnet rest api server runs on https://${DOMAIN}"
elif [[ -d /etc/certs ]]; then
  echo "using certificates provided in certs directory"
  rm -f /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* && \
  cp /opt/https.conf /etc/nginx/sites-enabled/https.conf
  nginx -s reload && \
  echo "mainnet rest api server runs on https://${DOMAIN}"
else
  echo "local mainnet server runs on http://${DOMAIN}"
fi

tail -f /dev/null
