import { Server, Socket } from "socket.io";
import Quiz, { IQuiz } from "../models/Quiz";

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
  questionStartTime?: number;
  started: boolean;
}

const activeQuizzes = new Map<string, ActiveQuiz>();

export const initializeSocket = (io: Server) => {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Add new event handler for starting quiz
    socket.on("startQuiz", (quizId: string) => {
      const quizState = activeQuizzes.get(quizId);
      if (!quizState || quizState.started) return;

      quizState.started = true;
      startQuestionTimer(io, quizId, quizState);
    });

    // Join quiz room
    socket.on("joinQuiz", async (quizId: string, username: string) => {
      try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return socket.emit("error", "Quiz not found");

        const player: Player = { socketId: socket.id, username, score: 0 };
        let quizState = activeQuizzes.get(quizId);

        if (quizState) {
          quizState.players.push(player);
        } else {
          quizState = {
            quiz,
            players: [player],
            currentQuestion: 0,
            started: false, // Initialize as not started
          };
          activeQuizzes.set(quizId, quizState);
        }

        socket.join(quizId);
        io.to(quizId).emit("playersUpdate", quizState.players);

        // Send current state to new player
        if (quizState.started) {
          const question = quizState.quiz.questions[quizState.currentQuestion];
          const elapsed = Date.now() - (quizState.questionStartTime || 0);
          const remaining = question.timeLimit - Math.floor(elapsed / 1000);

          socket.emit("questionUpdate", {
            text: question.text,
            options: question.options,
            timeLimit: Math.max(0, remaining),
            isLastQuestion: true
          });
        }
      } catch (error) {
        socket.emit("error", "Failed to join quiz");
      }
    });

    // Update answer handling to sort players
    socket.on("submitAnswer", (quizId: string, answer: string) => {
      const quizState = activeQuizzes.get(quizId);
      if (!quizState) return;

      const question = quizState.quiz.questions[quizState.currentQuestion];
      const player = quizState.players.find((p) => p.socketId === socket.id);

      if (player && answer === question.correctAnswer) {
        player.score += 10;
        // Sort players before emitting
        const sortedPlayers = [...quizState.players].sort(
          (a, b) => b.score - a.score
        );
        io.to(quizId).emit("scoreUpdate", sortedPlayers);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      activeQuizzes.forEach((quizState, quizId) => {
        quizState.players = quizState.players.filter(
          (p) => p.socketId !== socket.id
        );
        if (quizState.players.length === 0) activeQuizzes.delete(quizId);
        io.to(quizId).emit("playersUpdate", quizState.players);
      });
    });
  });
};

// Helper: Start timer for current question
const startQuestionTimer = async (
  io: Server,
  quizId: string,
  quizState: ActiveQuiz
) => {
  const question = quizState.quiz.questions[quizState.currentQuestion];

  if (quizState.timer) clearTimeout(quizState.timer);
  quizState.questionStartTime = Date.now();

  const numOfQuestions = quizState.quiz.questions.length
  const currentQuestion = quizState.currentQuestion + 1
  
  // Send full question data to frontend
  io.to(quizId).emit("questionUpdate", {
    text: question.text,
    options: question.options,
    timeLimit: question.timeLimit,
    isLastQuestion : currentQuestion >= numOfQuestions
  });

  quizState.timer = setTimeout(() => {
    quizState.currentQuestion++;
    if (quizState.currentQuestion >= quizState.quiz.questions.length) {
      io.to(quizId).emit("quizEnd", quizState.players);
      activeQuizzes.delete(quizId);
    } else {
      startQuestionTimer(io, quizId, quizState);
    }
  }, question.timeLimit * 1000);
};
