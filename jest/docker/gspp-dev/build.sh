#!/bin/sh

docker buildx build -t mainnet/gspp-dev --platform linux/arm64/v8,linux/amd64 --push .
