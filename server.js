require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const db = require('./db');

// Import all routes
const authRoutes = require('./routes/authRoutes');
const donorRoutes = require('./routes/donorRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Create servers
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Allow your frontend origin
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io Real-Time Logic
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User with ID: ${socket.id} joined room: ${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
        socket.leave(roomId);
        console.log(`User with ID: ${socket.id} left room: ${roomId}`);
    });

    socket.on('send_message', async (data) => {
        // The data object from the frontend contains: roomId, sender_id, message, timestamp
        try {
            const [request] = await db.query(
                'SELECT recipient_user_id, assigned_donor_id FROM blood_requests WHERE id = ?', 
                [data.roomId]
            );

            if (request.length > 0) {
                // Determine the recipient of the message
                const isSenderTheRecipient = request[0].recipient_user_id === data.sender_id;
                const recipientUserId = isSenderTheRecipient ? request[0].assigned_donor_id : request[0].recipient_user_id;

                // Save the message to the database
                await db.query(
                    'INSERT INTO chat_messages (request_id, sender_id, recipient_id, message) VALUES (?, ?, ?, ?)',
                    [data.roomId, data.sender_id, recipientUserId, data.message]
                );
                
                // Broadcast the message to everyone else in the same room
                socket.to(data.roomId).emit('receive_message', data);
                console.log(`Message broadcasted to room ${data.roomId}:`, data.message);
            }
        } catch (error) {
            console.error("Error saving/sending chat message:", error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server with real-time chat running on port ${PORT}`));