import {
  Container,
  Timeline,
  Form,
  SelectPicker,
  Button,
  List,
  Modal,
} from "rsuite";
import React from "react";
import ky from "ky";
import produce from "immer";
import useWebSocket, { ReadyState } from "react-use-websocket";

// Utilities
interface ToMap {
  id: string;
}

const toMap = <T extends ToMap>(toMaps: T[]): Record<string, T> => {
  return toMaps.reduce((prev, current) => {
    return {
      ...prev,
      [current.id]: current,
    };
  }, {} as Record<string, T>);
};

const fieldToCamelCase = (obj: Record<string, any>): Record<string, any> => {
  return Object.keys(obj).reduce((prev, current) => {
    return {
      ...prev,
      [toCamelCase(current)]: obj[current],
    };
  }, {});
};

const toCamelCase = (str: string): string => {
  str = str.charAt(0).toLowerCase() + str.slice(1);
  return str.replace(/[-_](.)/g, function (_match, group1) {
    return group1.toUpperCase();
  });
};

type Option = {
  label: string;
  value: string;
};

// Domain - Room
type Room = Readonly<{ id: string; title: string }>;

const defaultRoom: Room = {
  id: "c4baa7ac-60db-43bf-9fbd-76f4ba17c38d",
  title: "Room1",
};

// Domain - Message
type Message = Readonly<{
  id: string;
  text: string;
  userId: string;
}>;

type MessageFormInput = Pick<Message, "id" | "text" | "userId">;

// Domain - User
type User = Readonly<{
  id: string;
  name: string;
}>;

const userToOption = (user: User): Option => ({
  label: user.name,
  value: user.id,
});

// Initial Data
const initialFormInput: MessageFormInput = {
  id: "",
  text: "",
  userId: "",
};

// adapter
const apiClient = ky.create({
  prefixUrl: "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

const listUsers = async (): Promise<User[]> => {
  const response = await apiClient.get("users");
  const users: User[] = await response.json();
  return users;
};

const updateUser = async (user: User): Promise<void> => {
  try {
    await apiClient.patch(`users/${user.id}`, {
      json: {
        name: user.name,
      },
    });
  } catch {
    alert("fail");
  }
};

const listMessages = async (): Promise<Message[]> => {
  const response = await apiClient.get(`rooms/${defaultRoom.id}/messages`);
  const data = await response.json();
  const messages: Message[] = data.map(fieldToCamelCase);
  return messages;
};

const deleteMessage = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`rooms/${defaultRoom.id}/messages/${id}`);
  } catch {
    alert("fail");
  }
};

const createMessage = async (input: MessageFormInput): Promise<void> => {
  const body = input;
  try {
    await apiClient.post(`rooms/${defaultRoom.id}/messages`, {
      json: body,
    });
  } catch {
    alert("fail");
  }
};

// UI
function App() {
  const [formValue, setFormValue] =
    React.useState<MessageFormInput>(initialFormInput);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [targetUser, setTargetUser] = React.useState<User | null>(null);

  const openModal = (user: User) => {
    setTargetUser(user);
  };

  const isModalOpen = React.useMemo<boolean>(() => {
    return !!targetUser;
  }, [targetUser]);

  const userOptions = React.useMemo(() => users.map(userToOption), [users]);
  const usersMap = React.useMemo(() => toMap(users), [users]);

  const addMessage = async (newMessage: Message) => {
    try {
      await createMessage(newMessage);
      // setMessages((value) => [...value, newMessage]);
    } catch {
      alert("Failed");
    }
  };

  const resetFormValue = () => setFormValue(initialFormInput);

  const handleSubmit = async () => {
    await addMessage(formValue);
    resetFormValue();
  };

  React.useEffect(() => {
    (async () => {
      const [usersResponse, messagesResponse] = await Promise.all([
        listUsers(),
        listMessages(),
      ]);

      setUsers(usersResponse);
      setMessages(messagesResponse);
    })();
  }, [setUsers, setMessages]);

  // Websocket Subscription
  const messageWS = useWebSocket("ws://localhost:8080/ws/messages");
  React.useEffect(() => {
    if (messageWS.lastMessage !== null) {
      const wsMessage = JSON.parse(messageWS.lastMessage.data);
      if (wsMessage.command === "insert") {
        const newMessage = fieldToCamelCase(wsMessage.data) as Message;
        setMessages((value) => [...value, newMessage]);
      }

      if (wsMessage.command === "delete") {
        setMessages((value) => {
          const newMessages = produce(value, (draft) => {
            const idx = draft.findIndex(
              (message) => message.id === wsMessage.data.id
            );
            draft.splice(idx, 1);
          });
          return newMessages;
        });
      }
    }
  }, [messageWS.lastMessage, setMessages]);

  const userWS = useWebSocket("ws://localhost:8080/ws/users");
  React.useEffect(() => {
    if (userWS.lastMessage !== null) {
      const wsUser = JSON.parse(userWS.lastMessage.data);
      console.log("WsUser", wsUser);
      if (wsUser.command === "update") {
        setUsers((value) => {
          const newUsers = produce(value, (draft) => {
            const idx = draft.findIndex((user) => wsUser.data.id === user.id);
            const newUser = fieldToCamelCase(wsUser.data) as User;
            console.log("newUser", newUser);
            draft.splice(idx, 1, newUser);
          });
          return newUsers;
        });
      }
    }
  }, [userWS.lastMessage, setUsers]);

  return (
    <div style={{ padding: "32px", display: "flex" }}>
      <div style={{ width: "50%" }}>
        <Container>
          <div
            style={{ fontWeight: "bold", fontSize: "24px", padding: "16px 0" }}
          >
            Messages
          </div>
          <Form
            style={{ display: "flex", gap: "16px", alignItems: "center" }}
            formValue={formValue}
          >
            <Form.Group controlId="userId">
              <Form.ControlLabel>User</Form.ControlLabel>
              <SelectPicker
                name="user"
                data={userOptions}
                value={formValue.userId}
                onChange={(value) =>
                  setFormValue({ ...formValue, userId: value })
                }
              />
            </Form.Group>
            <Form.Group controlId="text">
              <Form.ControlLabel>Text</Form.ControlLabel>
              <Form.Control
                name="text"
                type="text"
                value={formValue.text}
                onChange={(value: string) => {
                  setFormValue({ ...formValue, text: value });
                }}
                style={{ maxWidth: "200px" }}
              />
            </Form.Group>
            <Form.Group>
              <Button onClick={handleSubmit}>Submit</Button>
            </Form.Group>
          </Form>
        </Container>
        <Timeline style={{ maxWidth: "380px" }}>
          {messages.map((msg, i) => (
            <Timeline.Item key={i}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "16px" }}>{msg.text}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      marginLeft: "4px",
                      color: "#999999",
                    }}
                  >
                    by {usersMap[msg.userId]?.name ?? "NoBody"}
                  </span>
                </div>
                <div
                  onClick={() => deleteMessage(msg.id)}
                  style={{
                    cursor: "pointer",
                    color: "#59afff",
                    fontSize: "12px",
                  }}
                >
                  DELETE
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
      <div style={{ width: "50%" }}>
        <div
          style={{
            fontWeight: "bold",
            fontSize: "24px",
            padding: "16px 0 32px",
          }}
        >
          Users
        </div>
        <List>
          {users.map((user) => (
            <List.Item
              key={user.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingLeft: "16px",
                paddingRight: "16px",
              }}
            >
              <div>{user.name}</div>
              <div
                style={{ cursor: "pointer", color: "#59afff" }}
                onClick={() => openModal(user)}
              >
                Edit
              </div>
            </List.Item>
          ))}
        </List>
      </div>
      {targetUser && (
        <UserEditModal
          open={isModalOpen}
          user={targetUser}
          handleClose={() => setTargetUser(null)}
        />
      )}
    </div>
  );
}

type UserEditModalProps = {
  user: User;
  open: boolean;
  handleClose: () => void;
};
const UserEditModal = ({ user, open, handleClose }: UserEditModalProps) => {
  const [formValue, setFormValue] = React.useState(user);

  const handleSubmit = async () => {
    try {
      await updateUser(formValue);
    } finally {
      handleClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div style={{ fontWeight: "bold", fontSize: "16px" }}>Edit user</div>
      <Container style={{ padding: "16px 0" }}>
        <Form
          style={{ display: "flex", gap: "16px", alignItems: "center" }}
          formValue={formValue}
        >
          <Form.Group controlId="name">
            <Form.ControlLabel>Name</Form.ControlLabel>
            <Form.Control
              name="text"
              type="text"
              value={formValue.name}
              onChange={(value: string) => {
                setFormValue({ ...formValue, name: value });
              }}
            />
          </Form.Group>
          <Form.Group>
            <Button onClick={handleSubmit}>Submit</Button>
          </Form.Group>
        </Form>
      </Container>
    </Modal>
  );
};

export default App;
