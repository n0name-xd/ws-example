import "./App.css";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  ConversationList,
  Conversation,
  Avatar,
  type MessageModel,
} from "@chatscope/chat-ui-kit-react";

interface IMessage {
  text: string;
  createdAt: string | number;
  senderId: string;
  role: "manager" | "user";
}

interface IMessageModel extends MessageModel {
  id?: string;
  isRead?: boolean;
}

function App() {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<IMessageModel[]>([]);
  const [activeUserId, setActiveUserId] = useState("123");
  const activeUserRef = useRef(activeUserId);
  useEffect(() => {
    activeUserRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) return;
    fetch(`http://localhost:3001/messages/history/${activeUserId}`)
      .then((res) => res.json())
      .then((data) => {
        const history = data.map(
          (msg: IMessage & { id: string; isRead: boolean }) => ({
            message: msg.text,
            sentTime: msg.createdAt,
            sender: msg.senderId,
            direction: msg.role === "manager" ? "outgoing" : "incoming",
            position: "single",
            id: msg.id,
            isRead: msg.isRead,
            files: data.files,
          }),
        );
        setMessages(history);

        const lastIncoming = [...data].reverse().find((m) => m.role === "user");
        if (lastIncoming && !lastIncoming.isRead && socketRef.current) {
          socketRef.current.emit("mark_as_read", {
            messageId: lastIncoming.id,
            chatWithId: activeUserId,
          });
        }
      })
      .catch((err) => console.error("Ошибка истории:", err));
  }, [activeUserId]);

  useEffect(() => {
    const socket = io("http://localhost:3001", {
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

    socket.on("connect_error", (error) => {
      console.error("Ошибка подключения:", error.message);
    });

    socket.on("new_message", (data) => {
      console.log("Данные от сокета:", data);

      const currentChatId = activeUserRef.current;

      const isFromActiveUser = String(data.senderId) === String(currentChatId);
      const isToActiveUser = String(data.receiverId) === String(currentChatId);

      if (isFromActiveUser || isToActiveUser) {
        const incomingMessage = {
          message: data.text,
          sentTime: data.createdAt || Date.now(),
          sender: data.senderId,
          direction: data.role === "manager" ? "outgoing" : "incoming",
          position: "single",
          id: data.id,
          isRead: data.isRead,
          files: data.files,
        };

        setMessages((prev: MessageModel[]) => {
          const isDuplicate = prev.some((m) => {
            if (m.message !== incomingMessage.message) return false;

            const prevTime = m.sentTime ? new Date(m.sentTime).getTime() : 0;
            const newTime = new Date(incomingMessage.sentTime).getTime();

            return Math.abs(prevTime - newTime) < 1000;
          });

          if (isDuplicate) return prev;
          return [...prev, incomingMessage] as MessageModel[];
        });
      }

      if (
        data.role === "user" &&
        String(data.senderId) === String(activeUserRef.current)
      ) {
        socket.emit("mark_as_read", {
          messageId: data.id,
          chatWithId: data.senderId,
        });
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSend = (_: string, textContent: string) => {
    if (socketRef.current && activeUserId) {
      socketRef.current.emit("message_to_server", {
        text: textContent,
        toUserId: activeUserId,
        // fileUrl: "/uploads/image.jpg",
        // fileType: "image",
      });
    }
  };

  return (
    <div>
      <h1>Панель Администратора</h1>
      <div style={{ display: "flex", height: "500px" }}>
        <div style={{ width: "300px", borderRight: "1px solid #ccc" }}>
          <ConversationList>
            <Conversation
              name="Пользователь 123"
              lastSenderName={activeUserId === "123" ? "Вы" : "Клиент"}
              active={activeUserId === "123"}
              onClick={() => setActiveUserId("123")}
            >
              <Avatar src="https://chatscope.io/storybook/react/assets/lilly-aj6lnGPk.svg" />
            </Conversation>

            <Conversation
              name="Пользователь 456"
              active={activeUserId === "456"}
              onClick={() => setActiveUserId("456")}
            >
              <Avatar src="https://chatscope.io/storybook/react/assets/zoe-E7ZdmXF0.svg" />
            </Conversation>
          </ConversationList>
        </div>
        <div style={{ flexGrow: 1 }}>
          <MainContainer style={{ borderRadius: "0 10px 10px 0" }}>
            <ChatContainer>
              <MessageList>
                {messages.map((m: IMessageModel, i) => (
                  <Message key={m.id || i} model={m}>
                    {/* Только для исходящих сообщений менеджера */}
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
              />
            </ChatContainer>
          </MainContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
