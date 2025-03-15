import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import router from './routes/auth';
import quizRouter from './routes/quiz'
import { initializeSocket } from './controllers/socket';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', router)
app.use('/api/quiz', quizRouter)

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ['GET', 'POST'],
    credentials: true
  }
});
initializeSocket(io);

export { app, server };
