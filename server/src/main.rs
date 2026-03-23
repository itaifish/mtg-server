use std::net::SocketAddr;

use mtg_server_sdk::{MtgService, MtgServiceConfig};
use tracing::info;

mod game;
mod handlers;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let config = MtgServiceConfig::builder().build();

    let app = MtgService::builder(config)
        .ping(handlers::ping)
        .create_game(handlers::create_game)
        .join_game(handlers::join_game)
        .get_game_state(handlers::get_game_state)
        .build()
        .expect("failed to build MtgService");

    let addr = SocketAddr::from(([127, 0, 0, 1], 13734));
    info!(%addr, "starting server");

    let server = hyper::Server::bind(&addr).serve(app.into_make_service());

    if let Err(err) = server.await {
        tracing::error!(%err, "server error");
    }
}
