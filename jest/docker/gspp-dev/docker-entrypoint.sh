#!/bin/bash

/home/cpp_slp_graph_search/server/proxy/gw &
node /home/cpp_slp_graph_search/gspp-zmq/index.js &
while true; do
  /home/cpp_slp_graph_search/build/bin/gs++ /data/config.toml
  sleep 5
done
