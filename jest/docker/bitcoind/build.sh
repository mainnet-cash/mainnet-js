#!/bin/sh

# docker buildx build -t mainnet/bitcoin-cash-node --platform linux/arm64/v8 --load .
# docker buildx build -t mainnet/bitcoin-cash-node --platform linux/amd64 --load .

docker buildx build --progress plain -t mainnet/bitcoin-cash-node --platform linux/arm64/v8,linux/amd64 --push .
