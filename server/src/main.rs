use std::net::SocketAddr;

use mtg_server_sdk::server::AddExtensionLayer;
use mtg_server_sdk::{MtgService, MtgServiceConfig};
use tracing::info;

mod cards;
mod conversions;
mod db;
mod deck;
mod engine;
mod game;
mod handler_helpers;
mod handlers;
mod store;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let db = db::connect().await.expect("failed to connect to database");
    let store = store::GameStore::new(db)
        .await
        .expect("failed to initialize game store");

    let config = MtgServiceConfig::builder()
        .layer(AddExtensionLayer::new(store))
        .build();

    let app = MtgService::builder(config)
        .ping(handlers::ping)
        .create_game(handlers::create_game)
        .join_game(handlers::join_game)
        .leave_game(handlers::leave_game)
        .list_games(handlers::list_games)
        .set_ready(handlers::set_ready)
        .get_card_image(handlers::get_card_image)
        .get_game_state(handlers::get_game_state)
        .submit_action(handlers::submit_action)
        .get_legal_actions(handlers::get_legal_actions)
        .build()
        .expect("failed to build MtgService");

    let addr = SocketAddr::from(([0, 0, 0, 0], 13734));
    info!(%addr, "starting server");

    let server = hyper::Server::bind(&addr).serve(app.into_make_service());

    if let Err(err) = server.await {
        tracing::error!(%err, "server error");
    }
}
