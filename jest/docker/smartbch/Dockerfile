FROM ubuntu:20.04 as builder

MAINTAINER Josh Ellithorpe <quest@mac.com>

ARG TARGETPLATFORM

# Update file limit
RUN sed -i -e '$a* soft nofile 65536\n* hard nofile 65536' /etc/security/limits.conf

# Install apt based dependencies
RUN apt-get -y update && apt-get -y upgrade && \
  DEBIAN_FRONTEND="noninteractive" apt-get -y install cmake gcc-8 g++-8 gcc g++ git libgflags-dev zlib1g-dev libbz2-dev liblz4-dev libzstd-dev make vim wget

# Setup build directory
WORKDIR /build

# Install Go
RUN export GOPLATFORM=$(echo ${TARGETPLATFORM} | tr "/" "-") && echo ${GOPLATFORM} && \
  wget -q https://dl.google.com/go/go1.16.5.${GOPLATFORM}.tar.gz && \
  tar zxvf go1.16.5.${GOPLATFORM}.tar.gz && \
  rm -rf go1.16.5.${GOPLATFORM}.tar.gz && \
  mv go /usr/local && \
  mkdir -p /go/bin

ENV GOROOT=/usr/local/go \
  GOPATH=/go
ENV PATH=$GOPATH/bin:$GOROOT/bin:$PATH

# Patch Go for larger cgo stack size
RUN wget -q https://github.com/smartbch/patch-cgo-for-golang/archive/refs/tags/v0.1.1.tar.gz && \
  tar zxvf v0.1.1.tar.gz && \
  rm v0.1.1.tar.gz && \
  cd patch-cgo-for-golang-0.1.1 && cp *.c $GOROOT/src/runtime/cgo/ && \
  cd /build && rm -rf patch-cgo-for-golang-0.1.1

# Build libsnappy
RUN wget -q https://github.com/google/snappy/archive/refs/tags/1.1.8.tar.gz && \
  tar zxvf 1.1.8.tar.gz && \
  rm 1.1.8.tar.gz && \
  cd snappy-1.1.8 && mkdir build && cd build && cmake -DBUILD_SHARED_LIBS=On ../ && make -j`nproc` && make install && \
  cd /build && rm -rf snappy-1.1.8


# Build rocksdb
RUN wget -q https://github.com/facebook/rocksdb/archive/refs/tags/v5.18.4.tar.gz && \
  tar zxvf v5.18.4.tar.gz && \
  rm v5.18.4.tar.gz && \
  cd rocksdb-5.18.4 && make CC=gcc-8 CXX=g++-8 install-shared -j`nproc` && \
  strip --strip-debug /usr/local/lib/librocksdb.so.5.18.4 && \
  cd /build && rm -rf rocksdb-5.18.4

ENV ROCKSDB_PATH="/usr/local" \
 CGO_CFLAGS="-I/$ROCKSDB_PATH/include" \
 CGO_LDFLAGS="-L/$ROCKSDB_PATH -lrocksdb -lstdc++ -lm -lz -lbz2 -lsnappy -llz4 -lzstd" \
 LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

# Create smartbch directory
WORKDIR /smart_bch

# Build libevmwrap.so
RUN git clone -b v0.3.0 --depth 1 https://github.com/smartbch/moeingevm && \
  cd moeingevm/evmwrap && make -j`nproc`

ENV EVMWRAP=/smart_bch/moeingevm/evmwrap/host_bridge/libevmwrap.so

# Build and setup smartbchd
RUN git clone -b v0.3.0 --depth 1 https://github.com/smartbch/smartbch && \
  cd smartbch && go build -tags cppbtree github.com/smartbch/smartbch/cmd/smartbchd && \
  cp /smart_bch/smartbch/smartbchd /build/smartbchd && \
  rm -rf /smart_bch/smartbch

WORKDIR /root
RUN /build/smartbchd init mynode --chain-id 0x2710 && \
  wget -q https://github.com/smartbch/artifacts/releases/download/v0.0.3/dot.smartbchd.tgz && \
  tar zxvf dot.smartbchd.tgz && \
  rm dot.smartbchd.tgz && \
  cp -rf dot.smartbchd/* .smartbchd/

ENV PATH=/build:$PATH

# Go back to main workdir.
WORKDIR /build

FROM ubuntu:20.04

RUN --mount=type=bind,src=/,dst=/builder,from=builder \
  cd /builder && \
  cp -rn --parents lib/*/libgflags.* / && \
  cp -rn --parents usr/local/lib / && \
  cp -rn --parents root / && \
  cp -rn --parents build / && \
  cp -rn --parents smart_bch/moeingevm/evmwrap/host_bridge/libevmwrap.so /

WORKDIR /root

COPY init_regtest.sh /build/init_regtest.sh

ENV PATH=/build:$PATH\
    LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH \
    EVMWRAP=/smart_bch/moeingevm/evmwrap/host_bridge/libevmwrap.so


VOLUME ["/root/.smartbchd"]

ENTRYPOINT ["smartbchd"]
EXPOSE 8545 8546
