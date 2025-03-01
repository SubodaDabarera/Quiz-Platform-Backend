import { Server, Socket } from 'socket.io';
import Quiz, { IQuiz } from '../models/Quiz';

interface Player {
  socketId: string;
  username: string;
  score: number;
}

interface ActiveQuiz {
    quiz: IQuiz;
  players: Player[];
  currentQuestion: number;
  timer?: NodeJS.Timeout;
}

const activeQuizzes = new Map<string, ActiveQuiz>();

export const initializeSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join quiz room
    socket.on('joinQuiz', async (quizId: string, username: string) => {
      try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return socket.emit('error', 'Quiz not found');

        // Initialize or update active quiz
        const player: Player = { socketId: socket.id, username, score: 0 };
        const quizState = activeQuizzes.get(quizId) || {
          quiz,
          players: [player],
          currentQuestion: 0
        };

        if (!activeQuizzes.has(quizId)) {
          activeQuizzes.set(quizId, quizState);
        } else {
          quizState.players.push(player);
        }

        // Join room and broadcast updates
        socket.join(quizId);
        io.to(quizId).emit('playersUpdate', quizState.players);
        startQuestionTimer(io, quizId, quizState);
      } catch (error) {
        socket.emit('error', 'Failed to join quiz');
      }
    });

    // Answer submission
    socket.on('submitAnswer', (quizId: string, answer: string) => {
      const quizState = activeQuizzes.get(quizId);
      if (!quizState) return;

      const question = quizState.quiz.questions[quizState.currentQuestion];
      const player = quizState.players.find(p => p.socketId === socket.id);

      if (player && answer === question.correctAnswer) {
        player.score += 10;
        io.to(quizId).emit('scoreUpdate', quizState.players);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      activeQuizzes.forEach((quizState, quizId) => {
        quizState.players = quizState.players.filter(p => p.socketId !== socket.id);
        if (quizState.players.length === 0) activeQuizzes.delete(quizId);
        io.to(quizId).emit('playersUpdate', quizState.players);
      });
    });
  });
};

// Helper: Start timer for current question
const startQuestionTimer = async(io: Server, quizId: string, quizState: ActiveQuiz) => {
  const question = quizState.quiz.questions[quizState.currentQuestion];
  
  if (quizState.timer) clearTimeout(quizState.timer);
  
  quizState.timer = setTimeout(() => {
    quizState.currentQuestion++;
    if (quizState.currentQuestion >= quizState.quiz.questions.length) {
      io.to(quizId).emit('quizEnd', quizState.players);
      activeQuizzes.delete(quizId);
    } else {
      io.to(quizId).emit('questionUpdate', quizState.quiz.questions[quizState.currentQuestion]);
      startQuestionTimer(io, quizId, quizState);
    }
  }, question.timeLimit * 1000);
};