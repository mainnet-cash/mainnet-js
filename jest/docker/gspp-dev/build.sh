#!/bin/sh

# docker buildx build --progress plain -t mainnet/gspp-dev --platform linux/arm64/v8 --load .
# docker buildx build --progress plain -t mainnet/gspp-dev --platform linux/amd64 --load .

docker buildx build --progress plain -t mainnet/gspp-dev --platform=linux/arm64/v8,linux/amd64 --push .
