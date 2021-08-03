#!/bin/sh

# docker buildx build -t mainnet/smartbch --platform=linux/arm64/v8,linux/amd64 --push .

docker buildx build --progress plain -t smartbch --platform=linux/arm64/v8 --load .