import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import multer from "multer";
import {
  addQuiz,
  addQuizFromFile,
  updateQuiz,
  deleteQuiz,
  getAllQuizzes,
  getSingleQuiz,
  deleteQuestion,
  submitQuiz,
  getQuizLeaderboard,
  getLatestQuiz,
  saveCompletedQuiz,
  getCompletedQuizzes,
  downloadQuizResults,
  downloadQuizTemplate
} from "../controller/quizController.js";

const router = express.Router();

console.log('✅ Quiz routes loading...');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Test route to check if routes are working
router.get("/test", (req, res) => {
  res.json({ message: "Quiz routes are working!" });
});

// Temporary test upload route
router.post("/test-upload", upload.single('file'), (req, res) => {
  console.log('✅ TEST UPLOAD: Route hit');
  console.log('✅ File received:', req.file);
  console.log('✅ Body received:', req.body);
  
  res.json({
    success: true,
    message: "Test upload successful!",
    file: req.file ? req.file.originalname : "No file",
    body: req.body
  });
});

// Existing routes
router.post("/add", isAuthenticated, addQuiz);
router.put("/update/:id", isAuthenticated, updateQuiz);
router.delete("/delete/:id", isAuthenticated, deleteQuiz);
router.delete("/delete/:quizId/question/:questionId", isAuthenticated, deleteQuestion);
router.get("/latest", getLatestQuiz); 
router.get("/getall", isAuthenticated, getAllQuizzes);
router.get("/:id", getSingleQuiz);
router.post("/submit/:quizId", isAuthenticated, submitQuiz);
router.get("/leaderboard/:quizId", isAuthenticated, getQuizLeaderboard);
router.post("/completed-quizzes", saveCompletedQuiz);
router.get("/completed-quizzes/:studentId", getCompletedQuizzes);

// File upload route
router.post("/upload", isAuthenticated, upload.single('file'), addQuizFromFile);

// Download routes
router.get("/results/:quizId/:format", isAuthenticated, downloadQuizResults);
router.get("/template/:format", isAuthenticated, downloadQuizTemplate);

export default router;