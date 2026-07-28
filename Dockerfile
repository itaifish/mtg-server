FROM public.ecr.aws/docker/library/rust:1.94-slim@sha256:cf09adf8c3ebaba10779e5c23ff7fe4df4cccdab8a91f199b0c142c53fef3e1a AS builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY server/ server/
COPY mtg-server-sdk/ mtg-server-sdk/
RUN cargo build --release --manifest-path server/Cargo.toml --bin mtg-server

FROM public.ecr.aws/docker/library/debian:13-slim@sha256:020c0d20b9880058cbe785a9db107156c3c75c2ac944a6aa7ab59f2add76a7bd
# Minimal runtime base: drops the Rust toolchain from the shipped image to shrink
# the OS-package CVE surface. apt-get upgrade pulls the patched Debian 13 packages.
# libssl3 is required at runtime because the binary dynamically links native-tls.
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends ca-certificates curl libssl3 \
    && curl -o /usr/local/share/ca-certificates/aws-rds-global-bundle.crt https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/mtg-server /usr/local/bin/mtg-server
EXPOSE 13734
CMD ["mtg-server"]
