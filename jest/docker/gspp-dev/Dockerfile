FROM node:14-buster-slim

ARG TARGETPLATFORM

# Get g++ for compiling, wget to download Boost, git to clone source code repo,
# and make to automate program compilation with Makefile provided
RUN apt-get update \
  && apt-get install -y git \
                        g++ \
                        make \
                        wget

# Download boost, untar, setup install with bootstrap and only do the Program Options library,
# and then install
RUN cd /home && wget https://boostorg.jfrog.io/artifactory/main/release/1.74.0/source/boost_1_74_0.tar.gz \
  && tar xfz boost_1_74_0.tar.gz \
  && rm boost_1_74_0.tar.gz \
  && cd boost_1_74_0 \
  && ./bootstrap.sh --prefix=/usr/local \
  && ./b2 install \
  && cd /home \
  && rm -rf boost_1_74_0

# Install build-essential, etc.
RUN apt install -y build-essential \
                   autoconf libtool \
                   pkg-config \
                   cmake \
                   libzmq3-dev

# Install gRPC and Protocol Buffers
RUN git clone -b v1.38.1 --depth 1 --recursive --shallow-submodules https://github.com/grpc/grpc \
  && cd grpc \
  && mkdir -p cmake/build \
  && cd cmake/build \
  && cmake -DgRPC_INSTALL=ON \
           -DgRPC_BUILD_TESTS=OFF \
           -DCMAKE_INSTALL_PREFIX=$MY_INSTALL_DIR \
           -DBUILD_SHARED_LIBS=ON \
      ../.. \
  && make -j`nproc` \
  && make install

# Add python for gs++ make process
RUN apt-get install -y python libgmp-dev

# clone and build gs++
RUN cd /home \
  && git clone https://github.com/mainnet-pat/cpp_slp_graph_search.git \
  && cd cpp_slp_graph_search \
  && git checkout absl \
  && mkdir build \
  && cd build \
  && cmake \
      -DCMAKE_BUILD_TYPE=Release \
      .. \
  && make -j`nproc` \
  && echo 1

ARG TARGETPLATFORM

RUN export GOPLATFORM=$(echo ${TARGETPLATFORM} | tr "/" "-") && echo ${GOPLATFORM} \
  && wget -q https://golang.org/dl/go1.13.8.${GOPLATFORM}.tar.gz \
  && rm -rf /usr/local/go && tar -C /usr/local -xzf go1.13.8.${GOPLATFORM}.tar.gz \
  && tar -C /usr/local -xzf go1.13.8.${GOPLATFORM}.tar.gz

ENV GOROOT=/usr/local/go
ENV GOPATH=/root/go
ENV GOBIN=/root/go/bin
ENV PATH=/usr/local/go/bin:/root/go/bin:/usr/bin/cmake/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN cd /home/cpp_slp_graph_search \
  && cd build && make && echo 10

RUN cd /home/cpp_slp_graph_search/server/proxy \
  && go mod download \
  && go install \
    github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway \
    github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2 \
    google.golang.org/protobuf/cmd/protoc-gen-go \
    google.golang.org/grpc/cmd/protoc-gen-go-grpc \
  && rm -rf gw && make

RUN cd /home/cpp_slp_graph_search \
  && git clone https://github.com/mainnet-pat/gspp-zmq && echo 10 \
  && cd gspp-zmq && yarn

COPY ./regtest.toml ./config.toml
COPY ./docker-entrypoint.sh /docker-entrypoint.sh

WORKDIR /home/cpp_slp_graph_search/build/bin

ENTRYPOINT [ "/docker-entrypoint.sh" ]
CMD [ "run" ]
