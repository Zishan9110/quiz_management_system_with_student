import { Quiz } from "../models/quizSchema.js";
import { CompletedQuiz } from "../models/completedQuizSchema .js";
import { Score } from "../models/score.js";
import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";

// ✅ Add Quiz (Manual)
export const addQuiz = catchAsyncErrors(async (req, res, next) => {
    const { title, description, questions, duration } = req.body;

    // Validate required fields
    if (!title || !questions || !duration) {
        return next(new ErrorHandler("Title, questions, and duration are required!", 400));
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
        return next(new ErrorHandler("Questions must be a non-empty array!", 400));
    }

    // Validate each question object
    for (const question of questions) {
        if (!question.question || !question.options || !question.correctAnswer) {
            return next(new ErrorHandler("Each question must have a question, options, and correctAnswer!", 400));
        }
        if (!Array.isArray(question.options) || question.options.length === 0) {
            return next(new ErrorHandler("Options must be a non-empty array!", 400));
        }
    }

    // Create the quiz
    const newQuiz = await Quiz.create({
        title,
        description: description || "", // Optional field
        questions,
        duration,
        createdBy: req.user.id, // Assuming user is authenticated
    });

    res.status(201).json({
        success: true,
        message: "Quiz added successfully!",
        quiz: newQuiz,
    });
});

// ✅ Add Quiz via File Upload (UPDATED)
export const addQuizFromFile = catchAsyncErrors(async (req, res, next) => {
    console.log('🔵 FILE UPLOAD: Request received');
    console.log('🔵 FILE UPLOAD: Request body:', req.body);
    console.log('🔵 FILE UPLOAD: Uploaded file:', req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
    } : 'No file');

    if (!req.file) {
        console.log('❌ FILE UPLOAD: No file uploaded');
        return next(new ErrorHandler("Please upload a file", 400));
    }

    const { title, description, duration } = req.body;
    
    console.log('🔵 FILE UPLOAD: Received data:', { title, description, duration });
    
    if (!title || !duration) {
        console.log('❌ FILE UPLOAD: Missing title or duration');
        return next(new ErrorHandler("Title and duration are required!", 400));
    }

    let questions = [];

    try {
        const fileBuffer = req.file.buffer;
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
        const fileName = req.file.originalname;

        console.log(`🔵 FILE UPLOAD: Processing file: ${fileName}, extension: ${fileExtension}, size: ${fileBuffer.length} bytes`);

        if (fileExtension === 'csv') {
            console.log('🔵 FILE UPLOAD: Processing CSV file');
            // Use the simple parser for better reliability
            questions = await parseCSVSimple(fileBuffer);
        } else if (fileExtension === 'json') {
            console.log('🔵 FILE UPLOAD: Processing JSON file');
            questions = await parseJSON(fileBuffer);
        } else {
            console.log('❌ FILE UPLOAD: Unsupported file format:', fileExtension);
            return next(new ErrorHandler("Unsupported file format. Use CSV or JSON", 400));
        }

        console.log(`✅ FILE UPLOAD: Parsed ${questions.length} questions from file`);

        // Validate parsed questions
        if (!Array.isArray(questions) || questions.length === 0) {
            console.log('❌ FILE UPLOAD: No valid questions found in file');
            return next(new ErrorHandler("No valid questions found in the file. Please check the file format.", 400));
        }

        // Validate each question
        for (const question of questions) {
            if (!question.question || !question.options || !question.correctAnswer) {
                console.log('❌ FILE UPLOAD: Invalid question found:', question);
                return next(new ErrorHandler("Each question must have question, options, and correctAnswer", 400));
            }
            if (!Array.isArray(question.options) || question.options.length === 0) {
                console.log('❌ FILE UPLOAD: Invalid options found:', question);
                return next(new ErrorHandler("Options must be a non-empty array", 400));
            }
            
            // Additional validation: ensure correctAnswer exists in options
            if (!question.options.includes(question.correctAnswer)) {
                console.log('❌ FILE UPLOAD: Correct answer not found in options:', {
                    question: question.question,
                    options: question.options,
                    correctAnswer: question.correctAnswer
                });
                return next(new ErrorHandler(`Correct answer "${question.correctAnswer}" not found in options for question: ${question.question}`, 400));
            }
        }

        console.log('🔵 FILE UPLOAD: Creating quiz in database...');

        // Create the quiz
        const newQuiz = await Quiz.create({
            title,
            description: description || "",
            questions,
            duration: parseInt(duration),
            createdBy: req.user.id,
        });

        console.log('✅ FILE UPLOAD: Quiz created successfully:', newQuiz._id);

        res.status(201).json({
            success: true,
            message: `Quiz added successfully from file! Processed ${questions.length} questions.`,
            quiz: newQuiz,
        });

    } catch (error) {
        console.error('❌ FILE UPLOAD ERROR:', error);
        console.error('❌ FILE UPLOAD ERROR STACK:', error.stack);
        return next(new ErrorHandler(`Error processing file: ${error.message}`, 400));
    }
});

// ✅ Update Quiz
export const updateQuiz = catchAsyncErrors(async (req, res, next) => {
    const { title, description, questions, duration } = req.body;

    // Validate required fields
    if (!title || !questions || !duration) {
        return next(new ErrorHandler("Title, questions, and duration are required!", 400));
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
        return next(new ErrorHandler("Questions must be a non-empty array!", 400));
    }

    // Validate each question object
    for (const question of questions) {
        if (!question.question || !question.options || !question.correctAnswer) {
            return next(new ErrorHandler("Each question must have a question, options, and correctAnswer!", 400));
        }
        if (!Array.isArray(question.options) || question.options.length === 0) {
            return next(new ErrorHandler("Options must be a non-empty array!", 400));
        }
    }

    // Update the quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
        req.params.id,
        { title, description, questions, duration },
        { new: true, runValidators: true }
    );

    if (!updatedQuiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    res.status(200).json({
        success: true,
        message: "Quiz updated successfully!",
        quiz: updatedQuiz,
    });
});

// 🗑 Delete Entire Quiz
export const deleteQuiz = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;

    // ✅ Check if Quiz Exists
    const quiz = await Quiz.findById(id);
    if (!quiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    // ✅ Delete Quiz
    await Quiz.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Quiz deleted successfully!",
    });
});

// 🔹 Delete Single Question from Quiz
export const deleteQuestion = catchAsyncErrors(async (req, res, next) => {
    const { quizId, questionId } = req.params;

    // ✅ Check if Quiz Exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    // ✅ Remove Specific Question
    quiz.questions = quiz.questions.filter(q => q._id.toString() !== questionId);

    // ✅ Save Updated Quiz
    await quiz.save();

    res.status(200).json({
        success: true,
        message: "Question deleted successfully!",
    });
});

// ✅ Get All Quizzes
export const getAllQuizzes = catchAsyncErrors(async (req, res, next) => {
    let quizzes;

    if (req.user.role === "admin") {
        quizzes = await Quiz.find();
    } else {
        const latestQuiz = await Quiz.findOne().sort({ createdAt: -1 });
        const completedQuizzes = await CompletedQuiz.find({ student: req.user._id })
            .populate("quiz")
            .select("quiz");
        const completedQuizIds = completedQuizzes.map((cq) => cq.quiz);
        quizzes = [latestQuiz, ...completedQuizIds].filter(Boolean);
    }

    res.status(200).json({ success: true, quizzes });
});

// ✅ Get Single Quiz
export const getSingleQuiz = catchAsyncErrors(async (req, res, next) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    res.status(200).json({
        success: true,
        quiz,
    });
});

// ✅ Submit Quiz
export const submitQuiz = catchAsyncErrors(async (req, res, next) => {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    // Check if the student has already taken this quiz
    const previousAttempt = await CompletedQuiz.findOne({ quiz: quizId, student: userId });
    if (previousAttempt) {
        return res.status(400).json({
            success: false,
            message: "You have already taken this quiz.",
            result: previousAttempt,
        });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return next(new ErrorHandler("Quiz not found", 404));

    let score = 0;
    quiz.questions.forEach((q, index) => {
        if (q.correctAnswer === answers[index].selectedOption) score++;
    });

    const percentage = (score / quiz.questions.length) * 100;

    // Save the quiz result in the CompletedQuiz collection
    const completedQuiz = await CompletedQuiz.create({
        student: userId,
        quiz: quizId,
        score,
        totalQuestions: quiz.questions.length,
        percentage,
        questions: quiz.questions.map((q, index) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            selectedOption: answers[index].selectedOption,
        })),
    });

    // Save the score in the Score collection
    try {
        console.log("Creating Score document with data:", {
            quizId: quizId,
            studentId: userId,
            score: score,
            totalQuestions: quiz.questions.length,
            percentage: percentage,
        });

        const newScore = await Score.create({
            quizId: quizId,
            studentId: userId,
            score: score,
            totalQuestions: quiz.questions.length,
            percentage: percentage,
        });

        console.log("Score document created successfully:", newScore);
    } catch (error) {
        console.error("Error creating Score document:", error);
        if (error.name === "ValidationError") {
            console.error("Validation Error Details:", error.errors);
        }
        return next(new ErrorHandler("Failed to save score", 500));
    }

    res.status(200).json({ success: true, message: "Quiz submitted", result: completedQuiz });
});

// ✅ Get Quiz Leaderboard
export const getQuizLeaderboard = catchAsyncErrors(async (req, res, next) => {
    const { quizId } = req.params;

    // Validate quizId
    if (!quizId) {
        return res.status(400).json({ success: false, message: "Quiz ID is required" });
    }

    console.log("Fetching leaderboard for quizId:", quizId); // Debugging

    // Fetch all students who took the quiz, sorted by score (descending)
    const leaderboard = await Score.find({ quizId })
        .sort({ score: -1 }) // Sort by score in descending order
        .populate({
            path: "studentId", // Ensure this matches the field name in the Score model
            select: "fullName avatar", // Select 'fullName' and 'avatar' fields from the User model
        });

    console.log("Leaderboard data:", JSON.stringify(leaderboard, null, 2)); // Debugging

    res.status(200).json({ success: true, leaderboard });
});

// ✅ Get Latest Quiz
export const getLatestQuiz = catchAsyncErrors(async (req, res, next) => {
    // Fetch the latest quiz based on createdAt timestamp
    const latestQuiz = await Quiz.findOne().sort({ createdAt: -1 });

    if (!latestQuiz) {
        return next(new ErrorHandler("No quizzes found!", 404));
    }

    res.status(200).json({
        success: true,
        latestQuiz,
    });
});

// ✅ Save Completed Quiz
export const saveCompletedQuiz = catchAsyncErrors(async (req, res, next) => {
    const { student, quiz, score, totalQuestions, percentage, questions } = req.body;

    const completedQuiz = new CompletedQuiz({
        student,
        quiz,
        score,
        totalQuestions,
        percentage,
        questions,
    });

    await completedQuiz.save();
    res.status(201).json({ message: "Quiz completed successfully", completedQuiz });
});

// ✅ Get Completed Quizzes
export const getCompletedQuizzes = catchAsyncErrors(async (req, res, next) => {
    const { studentId } = req.params;

    // Fetch completed quizzes
    const completedQuizzes = await CompletedQuiz.find({ student: studentId })
        .populate({
            path: "quiz",
            model: "Quiz",
        })
        .sort({ completedAt: -1 });

    console.log("Completed Quizzes:", completedQuizzes);

    if (!completedQuizzes || completedQuizzes.length === 0) {
        return next(new ErrorHandler("No completed quizzes found", 404));
    }

    // Filter out null quizzes and format the response
    const formattedQuizzes = completedQuizzes
        .filter((quiz) => quiz.quiz !== null) // Filter out null quizzes
        .map((quiz) => ({
            score: {
                score: quiz.score,
                totalQuestions: quiz.totalQuestions,
                completedAt: quiz.completedAt,
            },
            quiz: quiz.quiz,
        }));

    res.status(200).json({
        success: true,
        completedQuizzes: formattedQuizzes,
    });
});

// ✅ Download Quiz Results
export const downloadQuizResults = catchAsyncErrors(async (req, res, next) => {
    const { quizId, format = 'csv' } = req.params;

    // Get quiz details
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
    }

    // Get all scores for this quiz
    const scores = await Score.find({ quizId })
        .populate('studentId', 'fullName email')
        .sort({ score: -1 });

    if (format === 'csv') {
        await downloadResultsAsCSV(res, quiz, scores);
    } else {
        return next(new ErrorHandler("CSV format is currently supported", 400));
    }
});

// ✅ Download Quiz Template
export const downloadQuizTemplate = catchAsyncErrors(async (req, res, next) => {
    const { format = 'csv' } = req.params;

    if (format === 'csv') {
        await downloadCSVTemplate(res);
    } else if (format === 'json') {
        await downloadJSONTemplate(res);
    } else {
        return next(new ErrorHandler("Unsupported format", 400));
    }
});

// ==================== UPDATED HELPER FUNCTIONS ====================

// Simple and reliable CSV parser
const parseCSVSimple = (buffer) => {
    return new Promise((resolve, reject) => {
        try {
            const questions = [];
            const content = buffer.toString();
            const lines = content.split('\n');
            let isFirstRow = true;

            console.log(`📄 SIMPLE CSV PARSER: Processing ${lines.length} lines`);

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line || isFirstRow) {
                    isFirstRow = false;
                    continue;
                }

                console.log(`🔵 SIMPLE CSV PARSER: Line ${i}: ${line}`);

                // Remove all outer quotes from the entire line
                line = line.replace(/^"|"$/g, '');

                // Split by comma but be careful with quoted sections
                const columns = [];
                let current = '';
                let inQuotes = false;
                
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        columns.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                columns.push(current.trim());

                console.log(`📊 SIMPLE CSV PARSER: Parsed ${columns.length} columns:`, columns);

                if (columns.length >= 3) {
                    const questionText = columns[0].replace(/^"|"$/g, '');
                    const optionsString = columns[1];
                    const correctAnswer = columns[2].replace(/^"|"$/g, '');

                    // Process options
                    let options = [];
                    if (optionsString && optionsString !== '""' && optionsString.trim() !== '') {
                        options = optionsString.split(',')
                            .map(opt => opt.trim())
                            .map(opt => opt.replace(/^"|"$/g, ''))
                            .filter(opt => opt);
                    }

                    // For fill-in-blank questions, use correct answer as the option
                    if (options.length === 0) {
                        options = [correctAnswer];
                    }

                    if (questionText && correctAnswer) {
                        const questionObj = {
                            question: questionText,
                            options: options,
                            correctAnswer: correctAnswer,
                            type: options.length > 1 ? 'mcq' : 'fillup'
                        };

                        questions.push(questionObj);
                        console.log(`✅ SIMPLE CSV PARSER: Added question ${i}`);
                    }
                } else if (columns.length === 2) {
                    // Handle fill-in-blank format: question,answer
                    const questionText = columns[0].replace(/^"|"$/g, '');
                    const correctAnswer = columns[1].replace(/^"|"$/g, '');

                    if (questionText && correctAnswer) {
                        const questionObj = {
                            question: questionText,
                            options: [correctAnswer],
                            correctAnswer: correctAnswer,
                            type: 'fillup'
                        };

                        questions.push(questionObj);
                        console.log(`✅ SIMPLE CSV PARSER: Added fill-in-blank question ${i}`);
                    }
                }
            }

            console.log(`🎉 SIMPLE CSV PARSER: Successfully parsed ${questions.length} questions`);
            resolve(questions);
        } catch (error) {
            console.error('❌ SIMPLE CSV PARSER ERROR:', error);
            reject(error);
        }
    });
};

// Helper function to parse JSON
const parseJSON = (buffer) => {
    try {
        const data = JSON.parse(buffer.toString());

        if (Array.isArray(data)) {
            return data;
        } else if (data.questions && Array.isArray(data.questions)) {
            return data.questions;
        } else {
            throw new Error("Invalid JSON format. Expected array or object with 'questions' array");
        }
    } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
    }
};

// Helper function to download results as CSV
const downloadResultsAsCSV = async (res, quiz, scores) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=quiz-results-${quiz.title.replace(/\s+/g, '-')}-${Date.now()}.csv`);

    let csvContent = 'Rank,Student Name,Email,Score,Total Questions,Percentage,Completed At\n';

    scores.forEach((score, index) => {
        const completedAt = score.createdAt ? new Date(score.createdAt).toLocaleString() : 'N/A';
        const rank = index + 1;
        const studentName = score.studentId?.fullName || 'N/A';
        const email = score.studentId?.email || 'N/A';
        
        csvContent += `${rank},"${studentName}","${email}",${score.score},${score.totalQuestions},${score.percentage.toFixed(2)}%,"${completedAt}"\n`;
    });

    res.send(csvContent);
};

// Helper function to download CSV template
const downloadCSVTemplate = async (res) => {
    const template = `Question,Options,CorrectAnswer
"What is the capital of France?","Paris,London,Berlin,Madrid","Paris"
"What is 2+2?","3,4,5,6","4"
"CPU stands for ______","Central Processing Unit","Central Processing Unit"
"Which of the following is not an operating system?","Windows,Linux,Oracle,Mac OS","Oracle"`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=quiz-template.csv');
    res.send(template);
};

// Helper function to download JSON template
const downloadJSONTemplate = async (res) => {
    const template = {
        "title": "Sample Quiz",
        "description": "This is a sample quiz created from template",
        "duration": 30,
        "questions": [
            {
                "question": "What is the capital of France?",
                "options": ["Paris", "London", "Berlin", "Madrid"],
                "correctAnswer": "Paris"
            },
            {
                "question": "What is 2+2?",
                "options": ["3", "4", "5", "6"],
                "correctAnswer": "4"
            },
            {
                "question": "What is the largest planet in our solar system?",
                "options": ["Earth", "Mars", "Jupiter", "Saturn"],
                "correctAnswer": "Jupiter"
            }
        ]
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=quiz-template.json');
    res.send(JSON.stringify(template, null, 2));
};