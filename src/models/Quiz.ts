import { Schema, model, Types } from 'mongoose';

export interface IQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number;
}

export interface IQuiz {
  title: string;
  description?: string;
  questions: IQuestion[];
  createdBy: Types.ObjectId;
}

const questionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  timeLimit: { type: Number, default: 15 }
});

const quizSchema = new Schema<IQuiz>({
  title: { type: String, required: true },
  description: String,
  questions: [questionSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

export default model<IQuiz>('Quiz', quizSchema);
