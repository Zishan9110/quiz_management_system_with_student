import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Quiz title is required"],
    trim: true,
    maxLength: [100, "Quiz title cannot exceed 100 characters"]
  },
  description: {
    type: String,
    default: "",
    trim: true,
    maxLength: [500, "Description cannot exceed 500 characters"]
  },
  questions: [
    {
      question: { 
        type: String, 
        required: [true, "Question text is required"],
        trim: true
      },
      options: [{ 
        type: String, 
        required: [true, "Options are required"],
        trim: true
      }],
      correctAnswer: { 
        type: String, 
        required: [true, "Correct answer is required"],
        trim: true
      },
    },
  ],
  duration: {
    type: Number,
    required: [true, "Duration is required"],
    min: [1, "Duration must be at least 1 minute"]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Index for better query performance
quizSchema.index({ createdBy: 1, createdAt: -1 });
quizSchema.index({ isActive: 1 });

export const Quiz = mongoose.model("Quiz", quizSchema);