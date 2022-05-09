import { Container, Timeline, Form, SelectPicker, Button, List } from "rsuite";
import React from "react";
import ky from "ky";

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
  return str.replace(/[-_](.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
};

type Option = {
  label: string;
  value: string;
};

// Domain = Room
type Room = Readonly<{ id: string; title: string }>;

const defaultRoom: Room = {
  id: "c4baa7ac-60db-43bf-9fbd-76f4ba17c38d",
  title: "Room1",
};

// Domain = Message
type Message = Readonly<{
  text: string;
  userId: string;
}>;

type MessageFormInput = Pick<Message, "text" | "userId">;

// Domain - User
type User = Readonly<{
  id: string;
  name: string;
}>;

const userToOption = (user: User) => ({ label: user.name, value: user.id });

// Initial Data
const initialFormInput: MessageFormInput = {
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

const listMessages = async (): Promise<Message[]> => {
  const response = await apiClient.get(`rooms/${defaultRoom.id}/messages`);
  const data = await response.json();
  const messages: Message[] = data.map(fieldToCamelCase);
  return messages;
};

const createMessage = async (input: MessageFormInput): Promise<void> => {
  const body = input;
  await apiClient.post(`rooms/${defaultRoom.id}/messages`, {
    json: body,
  });
  return;
};

// UI
function App() {
  const [formValue, setFormValue] =
    React.useState<MessageFormInput>(initialFormInput);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);

  const userOptions = React.useMemo(() => users.map(userToOption), [users]);
  const usersMap = React.useMemo(() => toMap(users), [users]);

  const addMessage = async (newMessage: Message) => {
    try {
      await createMessage(newMessage);
      setMessages((value) => [...value, newMessage]);
    } catch {
      alert("Failed");
    }
  };

  const resetFormValue = () => setFormValue({ text: "", userId: "" });

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
              />
            </Form.Group>
            <Form.Group>
              <Button onClick={handleSubmit}>Submit</Button>
            </Form.Group>
          </Form>
        </Container>
        <Timeline>
          {messages.map((msg, i) => (
            <Timeline.Item key={i}>
              <span>{msg.text}</span>
              <span
                style={{
                  fontSize: "12px",
                  marginLeft: "4px",
                  color: "#999999",
                }}
              >
                by {usersMap[msg.userId]?.name ?? "NoBody"}
              </span>
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
            <List.Item key={user.id}>{user.name}</List.Item>
          ))}
        </List>
      </div>
    </div>
  );
}

export default App;
