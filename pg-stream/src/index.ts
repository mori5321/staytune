import postgres from 'postgres';
import fastify, { FastifyRequest } from 'fastify';

import fastifyWebsocket, { SocketStream } from '@fastify/websocket';

const connectionString = 'postgresql://postgres:password@localhost:5001/staytune-dev?replication=database';
const sql = postgres(connectionString, { publications: 'alltables' });

const server = fastify();
server.register(fastifyWebsocket);

server.get('/ping', async (_req, _rep) => 'pong\n');

server.get('/subscribe', { websocket: true }, async (connection: SocketStream, _req: FastifyRequest) => {
  await sql.subscribe('*:messages', (row) => {
    connection.socket.send(JSON.stringify(row));
  });

  /* eslint-disable no-console */
  connection.socket.on('connection', () => {
    console.log('Connected');
    connection.socket.send('connected');
  });

  connection.socket.on('message', (message: string) => {
    connection.socket.send(`I got: ${message}`);
  });
});

server.listen(8080, (err, address) => {
  if (err) {
    process.exit(1);
  }

  /* eslint-disable no-console */
  console.log(`Server listening at ${address}`);
});
