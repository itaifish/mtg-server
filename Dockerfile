FROM public.ecr.aws/docker/library/rust:1.94-slim AS builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY server/ server/
COPY mtg-server-sdk/ mtg-server-sdk/
RUN cargo build --release --manifest-path server/Cargo.toml --bin mtg-server

FROM public.ecr.aws/docker/library/debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/mtg-server /usr/local/bin/mtg-server
EXPOSE 13734
CMD ["mtg-server"]
