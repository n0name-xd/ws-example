import type { User } from "../types";
import {
  ConversationList,
  Conversation,
  Avatar,
} from "@chatscope/chat-ui-kit-react";

interface IUsersProps {
  users: User[];
  activeRoomId: string | undefined | null;
  onChatSelect: (userId: string, roomId: string) => void;
}

export const Users: React.FC<IUsersProps> = ({
  users,
  activeRoomId,
  onChatSelect,
}) => {
  return (
    <div style={{ width: "300px", borderRight: "1px solid #ccc" }}>
      <ConversationList>
        {users?.map((e) => {
          return (
            <Conversation
              key={e.roomId}
              name={`Клиент: ${e.senderId}`}
              info={`Комната: ${e.roomName}`}
              active={activeRoomId === e.roomId}
              onClick={() => {
                const clientId =
                  e.role === "manager" ? e.receiverId : e.senderId;
                onChatSelect(clientId, e.roomId);
              }}
            >
              <Avatar src="https://chatscope.io/storybook/react/assets/lilly-aj6lnGPk.svg" />
            </Conversation>
          );
        })}
      </ConversationList>
    </div>
  );
};
