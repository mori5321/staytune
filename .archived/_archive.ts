import { Client } from 'pg';
import { parse } from 'pg-connection-string';
import QueryStream from 'pg-query-stream';

/* eslint-disable no-console */
const connectionString = 'postgresql://postgres:password@localhost:5001/staytune-dev?replication=database';
const parsed = parse(connectionString);
console.log('Parsed', parsed);

const run = async () => {
  console.log('Starting to Connect');
  const client = new Client(connectionString);
  // user: 'postgres',
  // host: 'localhost',
  // database: 'staytune-dev',
  // password: 'password',
  // port: 5001,
  // );
  //
  //
  await client.connect();

  client.on('error', (e) => {
    console.log('Error', e);
  });

  const sql = 'START_REPLICATION SLOT ocean LOGICAL 0/1718968';
  const query = new QueryStream(sql);
  const stream = client.query(query);

  // console.log('Stream', stream);

  stream.on('replicationStart', () => {
    console.log('Replication Start');

    stream.on('copyData', () => {
      console.log('Copy Data');
    });
  });

  stream.on('end', () => console.log('End'));
  // stream.on('replicationStart', () => {
  //   console.log('Replication Start');
  //   // stream.on('copyData', () => {
  //   //   console.log('Copy Data');
  //   // });
  // });

  // stream.on('error', (err) => console.log('Error', err));
  stream.on('data', (data) => console.log('Data', data));
  // stream.pipe(JSONStream.stringify()).pipe(process.stdout);

  // const rows = await client.query('SELECT * FROM messages');
  // console.log('Rows', rows);
};

run();
