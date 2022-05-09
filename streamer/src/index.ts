import postgres from 'postgres';
import fastify, { FastifyRequest } from 'fastify';

import fastifyWebsocket, { SocketStream } from '@fastify/websocket';

const connectionString = 'postgresql://postgres:password@localhost:5001/staytune-dev?replication=database';
const sql = postgres(connectionString, { publications: 'alltables' });

const server = fastify();
server.register(fastifyWebsocket);

server.get('/ping', async (_req, _rep) => 'pong\n');

server.get('/ws/messages', { websocket: true }, async (connection: SocketStream, _req: FastifyRequest) => {
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

type User = Readonly<{
  id: string,
  name: string,
}>;

type Room = Readonly<{
  id: string,
  title: string,
}>;

type Message = Readonly<{
  id: string,
  text: string,
}>;

type UserModel = User;

type RoomModel = Room;

type MessageModel = Message & {
  room_id: string,
  user_id: string,
}

// GET /users
server.get('/users', async (_req, _res) => {
  const users = await sql<UserModel[]>`SELECT * FROM users LIMIT 30`;

  return users;
});

// GET /rooms
server.get('/rooms', async (_req, _res) => {
  const rooms = await sql<RoomModel[]>`SELECT * FROM rooms LIMIT 30`;

  return rooms;
});

// GET /rooms/:id
server.get<{
  Params: { id: string }
}>('/rooms/:id', async (req, _res) => {
  const { id } = req.params;
  const rooms = await sql<RoomModel[]>`SELECT * FROM rooms WHERE id = ${id}`;

  if (rooms.length === 0) {
    throw new Error('Room Not Found');
  }

  return rooms[0];
});

// GET /rooms/:id/messages
server.get<{
  Params: { id: string }
}>('/rooms/:id/messages', async (req, _res) => {
  const { id } = req.params;
  const messages = await sql<MessageModel[]>`SELECT * FROM messages WHERE room_id = ${id} LIMIT 200`;

  return messages;
});

// POST /rooms/:id/messages
server.post<{
  Params: { id: string },
  Body: Pick<Message, 'text'> & { userId: string }
}>('/rooms/:id/messages', async (req, _res) => {
  await sql`
    INSERT INTO messages (id, text, user_id, room_id)
    VALUES (gen_random_uuid(), ${req.body.text}, ${req.body.userId}, ${req.params.id})`;

  return null;
});

server.listen(8080, (err, address) => {
  if (err) {
    process.exit(1);
  }

  /* eslint-disable no-console */
  console.log(`Server listening at ${address}`);
});
