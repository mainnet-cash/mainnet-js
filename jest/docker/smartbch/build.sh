#!/bin/sh

# docker buildx build --progress plain -t mainnet/smartbch --platform=linux/amd64 --load .
# docker buildx build --progress plain -t mainnet/smartbch --platform=linux/arm64/v8 --load .

docker buildx build --progress plain -t mainnet/smartbch --platform=linux/arm64/v8,linux/amd64 --push .
