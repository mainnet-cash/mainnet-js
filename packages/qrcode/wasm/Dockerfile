# FROM liuchong/rustup:nightly
FROM liuchong/rustup
RUN rustup target add wasm32-unknown-unknown --toolchain nightly
RUN cargo +nightly install wasm-bindgen-cli
RUN cargo install wasm-pack
RUN apt-get update && apt-get install git cmake python -y

WORKDIR /
# Build Binaryen v1.38.6
RUN BINARYEN_RELEASE=aab16136b9752eb0586b3a5b32b1d0e7a5803835 \
  && git clone --single-branch https://github.com/WebAssembly/binaryen.git \
  && cd binaryen \
  && git checkout $BINARYEN_RELEASE \
  && cmake . && make

# pbkdf2
COPY packages/qrcode/wasm/qrcode /mainnet-js/packages/qrcode/wasm/qrcode
WORKDIR /mainnet-js/packages/qrcode/wasm/qrcode
RUN mkdir -p out/qrcode
RUN wasm-pack build 
RUN ls pkg/*
RUN /binaryen/bin/wasm-opt -O3 pkg/qrcode_bg.wasm -o pkg/qrcode.wasm
RUN cp pkg/* out/qrcode
RUN OUTPUT_TS_FILE=out/qrcode/qrcode.base64.ts; printf "/**\n * @hidden\n */\n// prettier-ignore\nexport const qrcodeBase64Bytes =\n  '" > $OUTPUT_TS_FILE && base64 -w 0 pkg/qrcode.wasm >> $OUTPUT_TS_FILE && printf "';\n" >> $OUTPUT_TS_FILE
RUN cp -r out/qrcode /mainnet-js/packages/qrcode/bin

WORKDIR /mainnet-js/packages/qrcode/wasm/qrcode/

# copy outputs to mounted volume
CMD ["cp", "-r", "/mainnet-js/packages/qrcode/bin", "/mainnet-js/packages/qrcode/out"]