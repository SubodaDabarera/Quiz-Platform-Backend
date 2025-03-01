import { Router } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const user = new User({ username, email, password, role });    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.status(201).json({ token });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Protected route example
router.get('/me', auth, (req, res) => {
    //@ts-ignore
  res.json(req.user);
});

export default router;