#!/bin/bash
docker build docker/  --tag=fulcrum-regtest #--no-cache
docker container rm regtest || true
docker container create -p 60003:60003 --name regtest fulcrum-regtest 
docker start --attach --interactive regtest