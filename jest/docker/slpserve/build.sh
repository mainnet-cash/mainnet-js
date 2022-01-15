#!/bin/sh

# docker buildx build -t mainnet/slpserve --platform linux/arm64/v8 --load .
# docker buildx build -t mainnet/slpserve --platform linux/amd64 --load .

docker buildx build -t mainnet/slpserve --platform linux/arm64/v8,linux/amd64 --push .
