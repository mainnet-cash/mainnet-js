FROM node:14-buster-slim

RUN --mount=src=/,dst=/gspp-dev,from=mainnet/gspp-dev \
  cd /gspp-dev && \
  cp -rn --parents lib / && \
  cp -rn --parents usr/lib / && \
  cp -rn --parents usr/local/lib / && \
  cp -rn --parents home/cpp_slp_graph_search/build/bin/gs++* / && \
  cp -rn --parents home/cpp_slp_graph_search/server/proxy / && \
  cp -rn --parents home/cpp_slp_graph_search/config.toml / && \
  cp -rn --parents home/cpp_slp_graph_search/gspp-zmq /

COPY ./docker-entrypoint.sh /docker-entrypoint.sh

WORKDIR /home/cpp_slp_graph_search/build/bin

ENTRYPOINT [ "/docker-entrypoint.sh" ]
