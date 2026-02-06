import "./App.css";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { io, Socket } from "socket.io-client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  type MessageModel,
} from "@chatscope/chat-ui-kit-react";
import type { IMessageModel, User } from "./types";
import { AddChart } from "./components/AddChart";
import { Users } from "./components/Users";

const API_URL = "http://localhost:3001";

function App() {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<IMessageModel[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | undefined>();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const activeUserRef = useRef(activeUserId);
  const activeRoomRef = useRef(activeRoomId);
  const [users, setUsers] = useState<User[]>([]);
  const [activeRoomName, setActiveRoomName] = useState<string>("");

  function markAsRead(messageId: string, userId: string) {
    if (!socketRef.current || !messageId) return;

    socketRef.current.emit("mark_as_read", {
      messageId: messageId,
      chatWithId: userId,
    });
  }

  const getHistory = useCallback(() => {
    if (!activeRoomId) return;

    fetch(`${API_URL}/messages/history/room/${activeRoomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setMessages([]);
          return;
        }
        const history = data.map((msg) => ({
          message: msg.text,
          sentTime: msg.createdAt,
          sender: msg.senderId,
          direction: msg.role === "manager" ? "outgoing" : "incoming",
          position: "single",
          id: msg.id,
          isRead: msg.isRead,
          roomId: msg.roomId,
        })) as IMessageModel[];

        setMessages(history);

        const lastIncoming = [...data].reverse().find((m) => m.role === "user");

        if (lastIncoming && !lastIncoming.isRead) {
          socketRef.current?.emit("mark_as_read", {
            messageId: lastIncoming.id,
            chatWithId: lastIncoming.senderId,
          });
        }
      });
  }, [activeRoomId]);

  const getUsersList = useCallback(() => {
    fetch(`${API_URL}/managers/active-chats`)
      .then((res) => res.json())
      .then((serverUsers: User[]) => {
        setUsers((prevLocalUsers) => {
          const localOnly = prevLocalUsers.filter(
            (local) =>
              !serverUsers.some((server) => server.roomId === local.roomId),
          );

          return [...localOnly, ...serverUsers];
        });
      });
  }, []);

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
    activeUserRef.current = activeUserId;
  }, [activeRoomId, activeUserId]);

  useEffect(() => {
    getUsersList();
    getHistory();
  }, [getHistory, getUsersList]);

  useEffect(() => {
    const socket = io(API_URL, {
      query: { role: "manager", userId: "admin" },
      transports: ["websocket"],
      auth: { token: "abc2" },
    });

    socket.on(
      "messages_read",
      (data: { lastReadId: string; readerId: string }) => {
        if (String(data.readerId) === String(activeUserRef.current)) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.direction === "outgoing" && !m.isRead) {
                if (m.id === data.lastReadId) return { ...m, isRead: true };
              }
              return m;
            }),
          );
        }
      },
    );

    socket.on("update_chat_list", () => getUsersList());

    socket.on("connect_error", (error) =>
      console.error("Ошибка подключения:", error.message),
    );

    socket.on("new_message", (data) => {
      if (data.roomId === activeRoomRef.current) {
        if (data.role === "user") {
          socket.emit("mark_as_read", {
            messageId: data.id,
            chatWithId: data.senderId,
          });
        }

        const incomingMessage = {
          message: data.text,
          sentTime: data.createdAt || Date.now(),
          sender: data.senderId,
          direction: data.role === "manager" ? "outgoing" : "incoming",
          position: "single",
          id: data.id,
          isRead: data.isRead,
          roomId: data.roomId,
        };

        if (data.role === "user") {
          markAsRead(data.id, data.senderId);
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMessage.id)) return prev;
          return [...prev, incomingMessage] as MessageModel[];
        });
      }

      getUsersList();
    });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [getUsersList]);

  const handleSend = (_: string, textContent: string) => {
    if (!socketRef.current || !activeUserId || !activeRoomId) {
      console.error("Не выбран чат или нет коннекта");
      return;
    }

    socketRef.current.emit("message_to_server", {
      text: textContent,
      toUserId: activeUserId,
      roomId: activeRoomId,
      roomName: activeRoomName,
    });

    setActiveRoomName("");

    const myMessage: IMessageModel = {
      message: textContent,
      sentTime: new Date().toISOString(),
      sender: "manager",
      direction: "outgoing",
      position: "single",
      id: crypto.randomUUID(),
    };
    setMessages((prev) => [...prev, myMessage]);
  };

  const handleAddChat = (userId: string, topic: string) => {
    const newRoomId = crypto.randomUUID();
    setActiveUserId(userId);
    setActiveRoomId(newRoomId);
    setActiveRoomName(topic);
    setMessages([]);

    setUsers((prev) => {
      const newChat: User = {
        id: crypto.randomUUID(),
        senderId: userId,
        receiverId: "manager",
        role: "user",
        roomId: newRoomId,
        roomName: topic || "Новый чат",
      } as User;
      return [newChat, ...prev];
    });
  };

  return (
    <div>
      <h1 style={{ fontSize: "20px" }}>Панель Администратора</h1>
      <AddChart onAddChat={handleAddChat} />
      <div style={{ display: "flex", height: "500px" }}>
        <Users
          users={users}
          activeRoomId={activeRoomId}
          onChatSelect={(userId, roomId) => {
            setActiveUserId(userId);
            setActiveRoomId(roomId);
          }}
        />
        <div style={{ flexGrow: 1 }}>
          <MainContainer style={{ borderRadius: "0 10px 10px 0" }}>
            <ChatContainer>
              <MessageList>
                {messages.map((m: IMessageModel, i) => (
                  <Message key={m.id || i} model={m}>
                    {m.direction === "outgoing" && (
                      <Message.Footer>
                        <div
                          style={{
                            fontSize: "12px",
                            color: m.isRead ? "#06c" : "#999",
                          }}
                        >
                          {m.isRead ? "✓✓ Прочитано" : "✓ Отправлено"}
                        </div>
                      </Message.Footer>
                    )}
                  </Message>
                ))}
              </MessageList>
              <MessageInput
                placeholder={`Написать пользователю ${activeUserId}...`}
                onSend={handleSend}
                disabled={!activeUserId}
              />
            </ChatContainer>
          </MainContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
