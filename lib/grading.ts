import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for grading
export interface GradingRequest {
  question: string;
  studentAnswer: string;
  correctAnswer?: string;
  maxPoints: number;
  questionType: 'SHORT_ANSWER';
}

export interface GradingResponse {
  score: number; // 0, 1, or 2
  feedback: string;
}

export interface GradingError {
  error: string;
  fallbackScore: number;
  fallbackFeedback: string;
}

// Validation schema for GPT response
const gradingResponseSchema = z.object({
  score: z.number().min(0).max(2),
  feedback: z.string().min(1).max(300),
});

// Custom prompt for supportive tutor grading
function createGradingPrompt(request: GradingRequest): string {
  const { question, studentAnswer } = request;
  return `You are a supportive tutor and grader for a business course. For each student answer, provide a concise, focused evaluation (maximum three sentences). Only give feedback if the answer is at least partially correct or shows understanding. If the answer is incorrect, irrelevant, or indicates 'I don't know,' encourage the student to read the textbook and try again—do not give specific guidance or hints. For each answer, assign a score: 2 = fully correct, 1 = partially correct, 0 = incorrect. Do not reveal the correct answer. Respond with feedback and the score in the following format:\n\nFeedback: [your feedback here]\nScore: [0, 1, or 2]\n\nHere is the question and student answer:\nQUESTION: ${question}\nSTUDENT ANSWER: ${studentAnswer}`;
}

// Fallback grading logic when GPT fails
function fallbackGrading(request: GradingRequest): GradingResponse {
  const { studentAnswer } = request;
  const answer = studentAnswer.trim();
  if (!answer) {
    return {
      score: 0,
      feedback: "Please read the textbook and try again."
    };
  }
  if (/i don\'t know|no idea|not sure|don\'t understand/i.test(answer)) {
    return {
      score: 0,
      feedback: "Please read the textbook and try again."
    };
  }
  if (answer.length > 30) {
    return {
      score: 1,
      feedback: "Good effort! Your answer shows some understanding. Review the material to strengthen your response."
    };
  }
  return {
    score: 0,
    feedback: "Please read the textbook and try again."
  };
}

// Main grading function with comprehensive error handling
export async function gradeShortAnswer(request: GradingRequest): Promise<GradingResponse> {
  try {
    if (!request.studentAnswer || request.studentAnswer.trim().length === 0) {
      return {
        score: 0,
        feedback: 'Please read the textbook and try again.'
      };
    }
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using fallback grading');
      return fallbackGrading(request);
    }
    const prompt = createGradingPrompt(request);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a supportive tutor and grader for a business course. Always respond in the requested format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'text' }
    });
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }
    // Parse feedback and score from the response
    const feedbackMatch = responseText.match(/Feedback:\s*(.*)/i);
    const scoreMatch = responseText.match(/Score:\s*(\d)/i);
    let feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    // Truncate feedback to 300 characters before validation
    feedback = feedback.slice(0, 300);
    gradingResponseSchema.parse({ feedback, score });
    return { feedback, score };
  } catch (error) {
    console.error('Grading error:', error);
    return fallbackGrading(request);
  }
}

// Batch grading for multiple questions
export async function gradeMultipleQuestions(requests: GradingRequest[]): Promise<GradingResponse[]> {
  const results: GradingResponse[] = [];
  for (const request of requests) {
    try {
      const result = await gradeShortAnswer(request);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error grading question: ${request.question}`, error);
      results.push(fallbackGrading(request));
    }
  }
  return results;
}

// Utility function to calculate overall quiz statistics
export function calculateQuizStatistics(gradingResults: GradingResponse[]) {
  const totalScore = gradingResults.reduce((sum, result) => sum + result.score, 0);
  return {
    totalScore,
    questionCount: gradingResults.length
  };
} 