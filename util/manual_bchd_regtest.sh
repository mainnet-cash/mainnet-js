#/bin/bash
export $(cat .env.regtest | xargs)
./bin/bchd \
--$NETWORK \
--rpclisten=:$PORT \
--grpclisten=$HOST_IP:$GRPC_PORT \
--rpcuser=$RPC_USER \
--rpcpass=$RPC_PASS \
--miningaddr=$ADDRESS \
--addrindex \
--txindex \
