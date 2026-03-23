use tokio_postgres::{Client, NoTls};

/// Connect to Postgres using DB_SECRET (Secrets Manager JSON) or DATABASE_URL (local dev).
pub async fn connect() -> Result<Client, Box<dyn std::error::Error>> {
    let secret = std::env::var("DB_SECRET")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .expect("DB_SECRET or DATABASE_URL must be set");

    let conn_string = if secret.starts_with('{') {
        let v: serde_json::Value = serde_json::from_str(&secret)?;
        format!(
            "host={} port={} user={} password={} dbname={}",
            v["host"].as_str().unwrap_or("localhost"),
            v["port"].as_u64().unwrap_or(5432),
            v["username"].as_str().unwrap_or("mtg_admin"),
            v["password"].as_str().unwrap_or(""),
            v["dbname"].as_str().unwrap_or("mtg"),
        )
    } else {
        secret
    };

    let (client, conn) = tokio_postgres::connect(&conn_string, NoTls).await?;
    tokio::spawn(async move {
        if let Err(e) = conn.await {
            tracing::error!("postgres connection error: {e}");
        }
    });
    Ok(client)
}
