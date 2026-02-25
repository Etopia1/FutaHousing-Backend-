import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Adjust this in production
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('📡 New Socket.io client connected:', socket.id);

        socket.on('join', (userId: string) => {
            if (!userId || userId === 'null') return;
            socket.join(userId);
            console.log(`✅ User ${userId} successfully joined their private notification room`);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected from socket server');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const sendNotification = (userId: string, notification: any) => {
    if (io) {
        io.to(userId).emit('notification', notification);
    }
};
