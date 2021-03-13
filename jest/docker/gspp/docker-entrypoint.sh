#!/bin/bash

/home/cpp_slp_graph_search/server/proxy/gw &
/home/cpp_slp_graph_search/build/bin/gs++ /data/config.toml &
tail -f /dev/null
