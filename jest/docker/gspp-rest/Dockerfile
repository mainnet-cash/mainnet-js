FROM node:12

# clone and build gs++ rest
RUN cd /home \
  && git clone https://github.com/blockparty-sh/cpp_slp_graph_search.git \
  && cd cpp_slp_graph_search/rest \
  && cp .env.example .env \
  && npm install \
  && npm run build

WORKDIR /home/cpp_slp_graph_search/rest

CMD npm start
