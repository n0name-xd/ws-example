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

function App() {
  const socketRef = useRef<Socket | null>(null);
  const [message, setMessage] = useState<MessageModel[]>([]);
  const [activeUserId, setActiveUserId] = useState("123");

  useEffect(() => {
    const socket = io("http://localhost:3001", {
      query: { role: "manager", userId: "admin" },
      transports: ["websocket"],
    });

    socket.on("new_message", (data) => {
      const incomingMessage: MessageModel = {
        message: data.text,
        sentTime: data.timestamp || Date.now(),
        sender: data.senderId,
        direction: data.role === "manager" ? "outgoing" : "incoming",
        position: "single",
      };

      setMessage((prev) => [...prev, incomingMessage]);
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  const handleSend = (innerHtml: string, textContent: string) => {
    if (socketRef.current) {
      socketRef.current.emit("message_to_server", {
        text: textContent,
        toUserId: activeUserId,
      });
    }
  };

  return (
    <div className={""}>
      <h1>admin</h1>
      <div style={{ display: "flex", height: "500px" }}>
        <div style={{ width: "200px" }}>
          <ConversationList
            style={{
              height: "340px",
            }}
          >
            <Conversation
              name="Lilly (User 123)"
              active={activeUserId === "123"}
              onClick={() => setActiveUserId("123")}
            >
              <Avatar src="https://chatscope.io/storybook/react/assets/lilly-aj6lnGPk.svg" />
            </Conversation>
            <Conversation
              info="Yes i can do it for you"
              lastSenderName="Lilly"
              name="Lilly"
            >
              <Avatar
                name="Lilly"
                src="https://chatscope.io/storybook/react/assets/lilly-aj6lnGPk.svg"
              />
            </Conversation>

            <Conversation
              info="Yes i can do it for you"
              lastSenderName="Zoe"
              name="Zoe"
            >
              <Avatar
                name="Zoe"
                src="https://chatscope.io/storybook/react/assets/zoe-E7ZdmXF0.svg"
              />
            </Conversation>
          </ConversationList>
        </div>
        <div style={{ width: "500px" }}>
          <MainContainer style={{ borderRadius: "10px" }}>
            <ChatContainer>
              <MessageList>
                {message.map((e) => {
                  return <Message key={e.sentTime} model={e} />;
                })}
              </MessageList>
              <MessageInput
                placeholder="Message"
                onAttachClick={() => {}}
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
