
docker container kill $(docker ps | awk '/regtest/ {print $1}')