use tokio_postgres::{Error, NoTls};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let (client, connection) = tokio_postgres::connect(
        "host=localhost user=postgres port=5001 password=password dbname=staytune-dev replication=database", // connect functionがreplication=databaseに非対応だった
        NoTls,
    )
    .await?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let rows = client.query("SELECT * FROM messages", &[]).await?;

    for r in rows {
        let v: &str = r.get(1);
        println!("row: {}", v);
    }

    let replication = client
        .query("START_REPLICATION SLOT slot_b LOGICAL 0/0", &[])
        .await?;

    // for r in replication {
    //     let v = r;
    //     println!("row: {:?}", v);
    // }

    Ok(())

    // replication_connection
    //     .execute(
    //         "CREATE_REPLICATION_SLOT dev_slot LOGICAL wal2json EXPORT_SNAPSHOT",
    //         &[],
    //     )
    //     .unwrap();
}
