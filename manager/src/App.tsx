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

function App() {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<MessageModel[]>([]);
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
        const history = data.map((msg: IMessage) => ({
          message: msg.text,
          sentTime: msg.createdAt,
          sender: msg.senderId,
          direction: msg.role === "manager" ? "outgoing" : "incoming",
          position: "single",
        }));
        setMessages(history);
      })
      .catch((err) => console.error("Ошибка истории:", err));
  }, [activeUserId]);

  useEffect(() => {
    const socket = io("http://localhost:3001", {
      query: { role: "manager", userId: "admin" },
      transports: ["websocket"],
      auth: { token: "abc" },
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
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSend = (_: string, textContent: string) => {
    if (socketRef.current && activeUserId) {
      const newMessage = {
        message: textContent,
        sentTime: new Date().toISOString(),
        sender: "admin",
        direction: "outgoing",
        position: "single",
      } as MessageModel;

      setMessages((prev) => [...prev, newMessage]);

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
      <div style={{ display: "flex", height: "600px" }}>
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
                {messages.map((m, i) => (
                  <Message key={m?.sentTime ?? "" + i} model={m} />
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
