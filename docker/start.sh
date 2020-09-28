#!/bin/bash
docker build docker/ --tag=regtest #--no-cache
docker run -p 60003:60003 regtest 