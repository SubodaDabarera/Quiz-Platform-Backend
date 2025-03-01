import mongoose from 'mongoose';

const MONGO_DB_URI = 'mongodb://localhost:27017'

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_DB_URI!);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

export { connectDB };