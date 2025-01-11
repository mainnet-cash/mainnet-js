#!/bin/sh

# docker buildx build -t mainnet/bitcoin-cash-node:v28.0.1 --platform linux/arm64/v8 --load .
# docker buildx build -t mainnet/bitcoin-cash-node:v28.0.1 --platform linux/amd64 --load .

docker buildx build --progress plain -t mainnet/bitcoin-cash-node:latest --platform linux/arm64/v8,linux/amd64 --push .
