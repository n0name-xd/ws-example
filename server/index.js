const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    const { role, userId } = socket.handshake.query;
    console.log(`Подключен: ${role} (ID: ${userId})`);

    if (role === 'manager') {
        // Менеджер подписывается на общую комнату менеджеров
        socket.join('managers');
    } else {
        // Пользователь подписывается на свою личную комнату
        socket.join(`user_${userId}`);
    }

    // Обработка сообщения
    socket.on('message_to_server', (data) => {
        if (role === 'user') {
            const message = {
                senderId: userId,
                text: data.text,
                role: 'user',
                timestamp: new Date()
            };
            // Отправляем менеджеру(ам) и самому пользователю
            io.to('managers').emit('new_message', message);
            io.to(`user_${userId}`).emit('new_message', message);
        }

        else if (role === 'manager') {
            const message = {
                senderId: 'manager',
                text: data.text,
                role: 'manager',
                timestamp: new Date()
            };
            // Отправляем конкретному пользователю и всем менеджерам (для синхронизации)
            io.to(`user_${data.toUserId}`).emit('new_message', message);
            io.to('managers').emit('new_message', { ...message, toUserId: data.toUserId });
        }
    });

    socket.on('disconnect', () => {
        console.log('Отключено');
    });
});

server.listen(3001, () => {
    console.log('Сервер запущен на порту 3001');
});
