FROM public.ecr.aws/docker/library/rust:1.94-slim@sha256:cf09adf8c3ebaba10779e5c23ff7fe4df4cccdab8a91f199b0c142c53fef3e1a AS builder
RUN apt-get update \
    && apt-get install -y pkg-config libssl-dev ca-certificates curl \
    && curl -fsSL --create-dirs -o /certs/aws-rds-global-bundle.crt https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY server/ server/
COPY mtg-server-sdk/ mtg-server-sdk/
RUN cargo build --release --manifest-path server/Cargo.toml --bin mtg-server

FROM public.ecr.aws/docker/library/debian:13-slim@sha256:a99cfc517144bc59b1978475ec53b46ecabec7e43635402ee5b77cc54cd1b20a
# Minimal runtime base: drops the Rust toolchain from the shipped image to shrink
# the OS-package CVE surface. apt-get upgrade pulls the patched Debian 13 packages.
# libssl3 is required at runtime because the binary dynamically links native-tls.
# curl is deliberately absent: it pulls in libcurl4 and libssh2, and nothing at
# runtime needs it. The ALB target group probes /ping over HTTP, not via curl.
ARG PATCH_EPOCH=manual
LABEL os.patch.epoch=$PATCH_EPOCH
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /certs/aws-rds-global-bundle.crt /usr/local/share/ca-certificates/aws-rds-global-bundle.crt
RUN update-ca-certificates
COPY --from=builder /app/target/release/mtg-server /usr/local/bin/mtg-server
EXPOSE 13734
CMD ["mtg-server"]
