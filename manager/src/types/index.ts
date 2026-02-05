import { type MessageModel } from "@chatscope/chat-ui-kit-react";

export interface IMessage {
  text: string;
  createdAt: string | number;
  senderId: string;
  role: "manager" | "user";
  roomId: string;
}

export interface IMessageModel extends MessageModel {
  id?: string;
  isRead?: boolean;
}

export interface User {
  id: string;
  senderId: string;
  receiverId: string;
  role: string;
  roomId: string;
}
