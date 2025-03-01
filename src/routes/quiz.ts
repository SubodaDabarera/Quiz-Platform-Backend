import { Router } from 'express';
import Quiz from '../models/Quiz';
import { auth, roles } from '../middleware/auth';

const router = Router();

// Create Quiz (Admin only)
router.post('/', auth, roles('admin'), async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    const quiz = new Quiz({
      title,
      description,
      questions,
      //@ts-ignore
      createdBy: req.user._id
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(400).json({ message: 'Quiz creation failed' });
  }
});

// Get All Quizzes (Public)
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate('createdBy', 'username');
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
});

// Get Single Quiz (Public)
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'username');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
});

// Delete Quiz (Admin only)
router.delete('/:id', auth, roles('admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete quiz' });
  }
});

export default router;
