# ScopeIn
- スケーラビリティは常に考える

# ScopeOut
- 認証・認可は考えない

# Phase1
**pg -> streamer -> clientというシンプルな流れだけをつくる**
- pg-stream を直接websocketサーバーにしてしまう
- chatRoom / messages / user のテーブルを構築する
- chatRoomの概念をwebsocket上で自前構築する(fastify-websocketでは未対応のため)
  - ref: https://github.com/fastify/help/issues/589
- 簡単なclientAppをつくる
  - chatRoom一覧
  - chatRoom詳細
    - 投稿するuserは選択式で良い
- 全件を取得するためのAPIもつくっておく
  - [x] GET rooms
  - [x] GET rooms/:id
  - [x] GET rooms/:id/messages
  - [x] POST rooms/:id/messages
  - [x] DELETE rooms/:roomId/messages/:id
  - [x] GET users
  - [ ] GET users/:id
  - [ ] PATCH users/:id
  - [ ] POST users


# Phase2
**websocketサーバーを分離する**
- pg -> streamer -> chatRoom(websocket) という形式
- queueing system から目当てのchatRoomに対してどうやってpushするか
  - 一旦 ws://localhost:8080/ws/chatRooms/:id でいいんじゃないの?

# Phase3
**userの更新も伝播させる**
- いい感じのclientでのsubscribe抽象化のアイデアも必要

# Phase4
**queueing systemを挟む**
- pg -> streamer -> queueing system -> worker -> chatRoom(websocket)
- pg -> streamer -> queueing system -> GraphQL Subscription


# Phase5
**Actor Modelを試してみたい**
- 永続化をしない方向性

