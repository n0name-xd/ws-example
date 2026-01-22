"use client";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  type MessageModel,
} from "@chatscope/chat-ui-kit-react";

interface IMessage {
  text: string;
  createdAt: string;
  senderId: string;
  role: "manager" | "user";
}

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const [message, setMessage] = useState<MessageModel[]>([]);

  const userId = "123";

  useEffect(() => {
    fetch(`http://localhost:3001/messages/history/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const history = data.map((msg: IMessage) => {
          return {
            message: msg.text,
            sentTime: msg.createdAt,
            sender: msg.senderId,
            direction: msg.role === "manager" ? "incoming" : "outgoing",
            position: "single",
          };
        });
        setMessage(history);
      })
      .catch((err) => console.error("Ошибка загрузки истории:", err));

    const socket = io("http://localhost:3001", {
      query: { role: "user", userId: userId, token: "abc" },
      transports: ["websocket"],
    });

    socket.on("new_message", (data) => {
      const incomingMessage: MessageModel = {
        message: data.text,
        sentTime: data.createdAt || Date.now(),
        sender: data.senderId,
        direction: data.role === "manager" ? "incoming" : "outgoing",
        position: "single",
      };

      setMessage((prev) => {
        // if repeat
        const exists = prev.some(
          (m) =>
            m.sentTime === incomingMessage.sentTime &&
            m.message === incomingMessage.message,
        );
        if (exists) return prev;
        return [...prev, incomingMessage];
      });
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [userId]);

  const handleSend = (_: string, textContent: string) => {
    if (socketRef.current) {
      socketRef.current.emit("message_to_server", {
        text: textContent,
        toUserId: "manager",
        // fileUrl: "/uploads/image.jpg",
        // fileType: "image",
      });
    }
  };

  return (
    <main className="max-w-360 mx-auto">
      <h1 className="text-4xl font-semibold p-10">Чат с поддержкой</h1>
      <div className="h-150 w-100 fixed right-1 bottom-1">
        <MainContainer
          style={{ borderRadius: "10px", border: "1px solid #eee" }}
        >
          <ChatContainer>
            <MessageList>
              {message.map((e, index) => {
                return (
                  <Message
                    key={index}
                    model={e}
                    // avatarSpacer={e.direction === "outgoing"}
                  />
                );
              })}
            </MessageList>
            <MessageInput
              placeholder="Напишите сообщение..."
              onSend={handleSend}
              // attachButton={false}
            />
          </ChatContainer>
        </MainContainer>
      </div>
    </main>
  );
}
