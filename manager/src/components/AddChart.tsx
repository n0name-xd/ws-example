import React, { useState } from "react";

interface IAddChartProps {
  // Функция, которую мы вызываем для создания чата в App.tsx
  onAddChat: (userId: string, topic: string) => void;
}

export const AddChart: React.FC<IAddChartProps> = ({ onAddChat }) => {
  const [userId, setUserId] = useState("");
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    // Вызываем функцию из App.tsx
    onAddChat(userId, topic || "Без темы");

    // Очищаем поля
    setUserId("");
    setTopic("");
  };

  return (
    <div style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="ID пользователя (например, 123)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ padding: "5px", flexGrow: 1 }}
        />
        <input
          type="text"
          placeholder="Название темы (опционально)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ padding: "5px", flexGrow: 1 }}
        />
        <button
          type="submit"
          style={{ padding: "5px 15px", cursor: "pointer" }}
        >
          Начать новый чат
        </button>
      </form>
    </div>
  );
};
