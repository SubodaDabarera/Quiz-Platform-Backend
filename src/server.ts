import 'dotenv/config';
import { connectDB } from './config/db';
import { app, server } from './app';

const PORT = process.env.PORT || 5000;

// Database connection
connectDB();

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});