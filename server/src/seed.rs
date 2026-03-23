//! Seed the `cards` table from Scryfall's oracle_cards bulk data.
//! Downloads normal-size card images to S3 and stores the S3 key in the DB.
//!
//! Required env vars:
//!   DB_SECRET or DATABASE_URL — Postgres connection
//!   CARD_IMAGES_BUCKET        — S3 bucket name
//!   AWS_REGION (or defaults)  — for S3 client

mod db;

use aws_sdk_s3::primitives::ByteStream;
use serde::Deserialize;

#[derive(Deserialize)]
struct BulkDataResponse {
    data: Vec<BulkDataEntry>,
}

#[derive(Deserialize)]
struct BulkDataEntry {
    #[serde(rename = "type")]
    data_type: String,
    download_uri: String,
}

/// Extract the "normal" image URL from a Scryfall card JSON value.
/// Normal cards have top-level `image_uris`; DFCs have them on `card_faces[0]`.
fn normal_image_url(card: &serde_json::Value) -> Option<String> {
    card.get("image_uris")
        .or_else(|| card.get("card_faces")?.get(0)?.get("image_uris"))
        .and_then(|uris| uris.get("normal"))
        .and_then(|v| v.as_str())
        .map(String::from)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let bucket = std::env::var("CARD_IMAGES_BUCKET").expect("CARD_IMAGES_BUCKET must be set");
    let pg = db::connect().await?;
    let aws_config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    let s3 = aws_sdk_s3::Client::new(&aws_config);
    let http = reqwest::Client::new();

    tracing::info!("connected to postgres, using bucket {bucket}");

    // Create table
    pg.batch_execute(
        "CREATE TABLE IF NOT EXISTS cards (
            id            TEXT PRIMARY KEY,
            oracle_id     TEXT,
            name          TEXT NOT NULL,
            lang          TEXT,
            layout        TEXT,
            mana_cost     TEXT,
            cmc           DOUBLE PRECISION,
            type_line     TEXT,
            oracle_text   TEXT,
            power         TEXT,
            toughness     TEXT,
            loyalty       TEXT,
            defense       TEXT,
            colors        JSONB,
            color_identity JSONB,
            keywords      JSONB,
            rarity        TEXT,
            set_code      TEXT,
            set_name      TEXT,
            legalities    JSONB,
            image_key     TEXT,
            scryfall_json JSONB NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards (oracle_id);
        CREATE INDEX IF NOT EXISTS idx_cards_name ON cards (name);",
    )
    .await?;
    tracing::info!("cards table ready");

    // Fetch bulk data catalog
    let bulk: BulkDataResponse = http
        .get("https://api.scryfall.com/bulk-data")
        .send()
        .await?
        .json()
        .await?;

    let oracle_entry = bulk
        .data
        .iter()
        .find(|e| e.data_type == "oracle_cards")
        .expect("oracle_cards not found in bulk-data response");

    tracing::info!(uri = %oracle_entry.download_uri, "downloading oracle cards");

    let cards: Vec<serde_json::Value> = http
        .get(&oracle_entry.download_uri)
        .send()
        .await?
        .json()
        .await?;

    tracing::info!(count = cards.len(), "downloaded cards, seeding DB");

    let stmt = pg
        .prepare(
            "INSERT INTO cards (
                id, oracle_id, name, lang, layout, mana_cost, cmc, type_line,
                oracle_text, power, toughness, loyalty, defense, colors,
                color_identity, keywords, rarity, set_code, set_name,
                legalities, image_key, scryfall_json
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
            ) ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                oracle_text = EXCLUDED.oracle_text,
                legalities = EXCLUDED.legalities,
                image_key = EXCLUDED.image_key,
                scryfall_json = EXCLUDED.scryfall_json",
        )
        .await?;

    let mut count = 0u64;
    for raw in &cards {
        let id = raw["id"].as_str().unwrap_or_default();

        // Download image to S3
        let image_key = if let Some(url) = normal_image_url(raw) {
            let key = format!("cards/{id}.jpg");
            let bytes = http.get(&url).send().await?.bytes().await?;
            s3.put_object()
                .bucket(&bucket)
                .key(&key)
                .body(ByteStream::from(bytes))
                .content_type("image/jpeg")
                .send()
                .await?;
            Some(key)
        } else {
            None
        };

        let str_field = |f: &str| raw.get(f).and_then(|v| v.as_str()).map(String::from);
        let json_field = |f: &str| raw.get(f).cloned();

        pg.execute(
            &stmt,
            &[
                &id,
                &str_field("oracle_id"),
                &raw["name"].as_str().unwrap_or(""),
                &str_field("lang"),
                &str_field("layout"),
                &str_field("mana_cost"),
                &raw.get("cmc").and_then(|v| v.as_f64()),
                &str_field("type_line"),
                &str_field("oracle_text"),
                &str_field("power"),
                &str_field("toughness"),
                &str_field("loyalty"),
                &str_field("defense"),
                &json_field("colors"),
                &json_field("color_identity"),
                &json_field("keywords"),
                &str_field("rarity"),
                &str_field("set"),
                &str_field("set_name"),
                &json_field("legalities"),
                &image_key,
                &raw,
            ],
        )
        .await?;

        count += 1;
        if count % 1000 == 0 {
            tracing::info!(count, "progress");
        }
    }

    tracing::info!(total = count, "seed complete");
    Ok(())
}
