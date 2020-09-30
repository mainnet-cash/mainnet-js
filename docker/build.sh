#!/bin/bash
docker build docker/  --tag=fulcrum-regtest --no-cache
docker container rm regtest || true
docker container create -p 60003:60003 -p 18443:18443 --name regtest fulcrum-regtest 