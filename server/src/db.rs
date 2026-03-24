use tokio_postgres::Client;

/// Connect to Postgres using DB_SECRET (Secrets Manager JSON) or DATABASE_URL (local dev).
pub async fn connect() -> Result<Client, anyhow::Error> {
    let secret = std::env::var("DB_SECRET")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .expect("DB_SECRET or DATABASE_URL must be set");

    let is_secrets_manager = secret.starts_with('{');

    let conn_string = if is_secrets_manager {
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

    if is_secrets_manager {
        let tls_connector = native_tls::TlsConnector::new()?;
        let tls = postgres_native_tls::MakeTlsConnector::new(tls_connector);
        let (client, conn) = tokio_postgres::connect(&conn_string, tls).await?;
        tokio::spawn(async move {
            if let Err(e) = conn.await {
                tracing::error!("postgres connection error: {e}");
            }
        });
        Ok(client)
    } else {
        let (client, conn) = tokio_postgres::connect(&conn_string, tokio_postgres::NoTls).await?;
        tokio::spawn(async move {
            if let Err(e) = conn.await {
                tracing::error!("postgres connection error: {e}");
            }
        });
        Ok(client)
    }
}
