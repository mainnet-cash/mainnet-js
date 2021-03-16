FROM ubuntu:18.04

# Get g++ for compiling, wget to download Boost, git to clone source code repo,
# and make to automate program compilation with Makefile provided
RUN apt-get update \
  && apt-get install -y git \
                        g++ \
                        make \
                        wget

# Download boost, untar, setup install with bootstrap and only do the Program Options library,
# and then install
RUN cd /home && wget https://dl.bintray.com/boostorg/release/1.74.0/source/boost_1_74_0.tar.gz \
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
                   pkg-config

# Install CMAKE (>3.13 required for gRPC build)
RUN wget https://github.com/Kitware/CMake/releases/download/v3.18.4/cmake-3.18.4-Linux-x86_64.sh \
      -q -O /tmp/cmake-install.sh \
      && chmod u+x /tmp/cmake-install.sh \
      && mkdir /usr/bin/cmake \
      && /tmp/cmake-install.sh --skip-license --prefix=/usr/bin/cmake \
      && rm /tmp/cmake-install.sh
ENV PATH="/usr/bin/cmake/bin:${PATH}"

# Install zmq and gmp
RUN apt install -y libzmq3-dev

# Install gRPC and Protocol Buffers
RUN git clone -b v1.30.2 --depth 1 --recursive --shallow-submodules https://github.com/grpc/grpc \
  && cd grpc \
  && mkdir -p cmake/build \
  && cd cmake/build \
  && cmake -DgRPC_INSTALL=ON \
           -DgRPC_BUILD_TESTS=OFF \
           -DCMAKE_INSTALL_PREFIX=$MY_INSTALL_DIR \
           -DBUILD_SHARED_LIBS=ON \
      ../.. \
  && make \
  && make install

# Add python for gs++ make process
RUN apt-get install -y python libgmp-dev

# clone and build gs++
RUN cd /home \
  && git clone https://github.com/blockparty-sh/cpp_slp_graph_search.git \
  && cd cpp_slp_graph_search \
  && mkdir build \
  && cd build \
  && cmake \
      -DCMAKE_BUILD_TYPE=Debug \
      .. \
  && make -j4

COPY ./regtest.toml ./config.toml
COPY ./docker-entrypoint.sh ./entrypoint.sh
# COPY ./go1.13.8.linux-amd64.tar.gz /

RUN wget -q https://golang.org/dl/go1.13.8.linux-amd64.tar.gz
RUN rm -rf /usr/local/go && tar -C /usr/local -xzf go1.13.8.linux-amd64.tar.gz
RUN tar -C /usr/local -xzf go1.13.8.linux-amd64.tar.gz
ENV GOROOT=/usr/local/go
ENV GOPATH=/root/go
ENV GOBIN=/root/go/bin
ENV PATH=/usr/local/go/bin:/root/go/bin:/usr/bin/cmake/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN cd /home/cpp_slp_graph_search \
  && git remote add fork https://github.com/mainnet-pat/cpp_slp_graph_search.git \
  && git fetch fork \
  && git checkout wip \
  && cd build && make && echo 2

RUN cd /home/cpp_slp_graph_search/server/proxy \
  && go mod download \
  && go install \
    github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway \
    github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2 \
    google.golang.org/protobuf/cmd/protoc-gen-go \
    google.golang.org/grpc/cmd/protoc-gen-go-grpc \
  && make


ENTRYPOINT [ "./entrypoint.sh" ]
CMD [ "run" ]
