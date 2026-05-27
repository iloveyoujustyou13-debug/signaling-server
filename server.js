const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Create room
    socket.on('create-room', () => {
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        rooms[roomCode] = {
            creator: socket.id,
            users: [socket.id]
        };
        socket.join(roomCode);
        socket.emit('room-created', roomCode);
        console.log('📁 Room created:', roomCode);
    });

    // Join room
    socket.on('join-room', (roomCode) => {
        if (rooms[roomCode]) {
            rooms[roomCode].users.push(socket.id);
            socket.join(roomCode);
            socket.emit('room-joined', roomCode);
            socket.to(roomCode).emit('partner-joined');
            console.log('👤 User joined room:', roomCode);
        } else {
            socket.emit('room-error', 'Invalid room code');
        }
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
        socket.to(data.room).emit('offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    socket.on('answer', (data) => {
        socket.to(data.room).emit('answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    socket.on('signal', (data) => {
        socket.to(data.room).emit('signal', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // Leave room
    socket.on('leave-room', (roomCode) => {
        socket.leave(roomCode);
        socket.to(roomCode).emit('partner-left');
        if (rooms[roomCode]) {
            delete rooms[roomCode];
        }
        console.log('🚪 Room closed:', roomCode);
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Signaling server running on port ${PORT}`);
});
