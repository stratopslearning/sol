import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client with better configuration for scalability
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3, // Retry failed requests
  timeout: 30000, // 30 second timeout
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
  score: number; // Dynamic: 0 to maxPoints
  feedback: string;
  confidence?: number; // AI confidence in the grading
}

export interface GradingError {
  error: string;
  fallbackScore: number;
  fallbackFeedback: string;
}

// Dynamic validation schema based on maxPoints
function createGradingSchema(maxPoints: number) {
  return z.object({
    score: z.number().min(0).max(maxPoints),
    feedback: z.string().min(1).max(800),
    confidence: z.number().min(0).max(100).optional(),
  });
}

// Enhanced prompt with sample answer comparison and dynamic scoring
function createGradingPrompt(request: GradingRequest): string {
  const { question, studentAnswer, correctAnswer, maxPoints } = request;
  
  const hasSampleAnswer = correctAnswer && correctAnswer.trim().length > 0;
  
  if (hasSampleAnswer) {
    return `You are an expert business professor grading a short answer question worth ${maxPoints} points.

REFERENCE ANSWER: ${correctAnswer}
STUDENT ANSWER: ${studentAnswer}

GRADING INSTRUCTIONS:
Compare the student's answer against the reference answer. Focus on:
- Key concepts and terminology covered
- Understanding demonstrated
- Completeness of response
- Business knowledge accuracy

SCORING RUBRIC (${maxPoints} points total):
- ${maxPoints} points: Excellent - captures all key concepts from reference answer
- ${Math.round(maxPoints * 0.8)}-${maxPoints - 1} points: Very Good - captures most key concepts
- ${Math.round(maxPoints * 0.6)}-${Math.round(maxPoints * 0.79)} points: Good - captures many key concepts
- ${Math.round(maxPoints * 0.4)}-${Math.round(maxPoints * 0.59)} points: Satisfactory - captures some key concepts
- 1-${Math.round(maxPoints * 0.39)} points: Needs Improvement - captures few key concepts
- 0 points: Incorrect or shows no understanding

FEEDBACK REQUIREMENTS:
- 1 sentence: What the student did well (be specific about concepts covered)
- 1 sentence: One concrete area for improvement with actionable advice

RESPONSE FORMAT:
Feedback: [your feedback here - exactly 2 sentences]
Score: [0 to ${maxPoints}]
Confidence: [0-100, how confident are you in this grade]

QUESTION: ${question}`;
  } else {
    // Fallback prompt when no sample answer is provided
    return `You are an expert business professor grading a short answer question worth ${maxPoints} points.

STUDENT ANSWER: ${studentAnswer}

GRADING INSTRUCTIONS:
Assess the student's understanding based on:
- Business knowledge demonstrated
- Relevance to the question
- Clarity and completeness
- Use of appropriate terminology

SCORING RUBRIC (${maxPoints} points total):
- ${maxPoints} points: Excellent - comprehensive understanding shown
- ${Math.round(maxPoints * 0.8)}-${maxPoints - 1} points: Very Good - solid understanding
- ${Math.round(maxPoints * 0.6)}-${Math.round(maxPoints * 0.79)} points: Good - adequate understanding
- ${Math.round(maxPoints * 0.4)}-${Math.round(maxPoints * 0.59)} points: Satisfactory - basic understanding
- 1-${Math.round(maxPoints * 0.39)} points: Needs Improvement - limited understanding
- 0 points: Incorrect or shows no understanding

FEEDBACK REQUIREMENTS:
- 1 sentence: What the student did well
- 1 sentence: One specific area for improvement

RESPONSE FORMAT:
Feedback: [your feedback here - exactly 2 sentences]
Score: [0 to ${maxPoints}]
Confidence: [0-100, how confident are you in this grade]

QUESTION: ${question}`;
  }
}

// Enhanced fallback grading with dynamic scoring
function fallbackGrading(request: GradingRequest): GradingResponse {
  const { studentAnswer, maxPoints } = request;
  const answer = studentAnswer.trim();
  
  if (!answer) {
    return {
      score: 0,
      feedback: "Please read the textbook and try again.",
      confidence: 100
    };
  }
  
  if (/i don\'t know|no idea|not sure|don\'t understand|idk/i.test(answer.toLowerCase())) {
    return {
      score: 0,
      feedback: "Please read the textbook and try again.",
      confidence: 100
    };
  }
  
  // Simple length-based scoring as fallback
  const answerLength = answer.length;
  const minLength = 20; // Minimum expected length for a good answer
  
  if (answerLength < minLength) {
    return {
      score: Math.round(maxPoints * 0.3), // 30% of max points
      feedback: "Your answer is quite brief. Try to provide more detail and examples to demonstrate your understanding.",
      confidence: 70
    };
  }
  
  if (answerLength < minLength * 2) {
    return {
      score: Math.round(maxPoints * 0.6), // 60% of max points
      feedback: "Good effort! Your answer shows some understanding. Consider adding more specific examples or business terminology.",
      confidence: 75
    };
  }
  
  return {
    score: Math.round(maxPoints * 0.8), // 80% of max points
    feedback: "Good answer! You've demonstrated understanding of the topic. Review the material to strengthen any weak areas.",
    confidence: 80
  };
}

// Main grading function with comprehensive error handling and scalability
export async function gradeShortAnswer(request: GradingRequest): Promise<GradingResponse> {
  // Declare variables outside try block for error handling
  let score = 0;
  let feedback = '';
  
  try {
    // Input validation
    if (!request.studentAnswer || request.studentAnswer.trim().length === 0) {
      return {
        score: 0,
        feedback: 'Please read the textbook and try again.',
        confidence: 100
      };
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using fallback grading');
      return fallbackGrading(request);
    }
    
    // Rate limiting for scalability (basic implementation)
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between requests
    
    const prompt = createGradingPrompt(request);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business professor providing accurate, consistent grading. Always follow the exact format requested and use the scoring rubric provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent grading
      max_tokens: 800,
      response_format: { type: 'text' }
    });
    
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }
    
    // Enhanced parsing with confidence score
    const feedbackMatch = responseText.match(/Feedback:\s*(.*?)(?=\n|$)/i);
    const scoreMatch = responseText.match(/Score:\s*(\d+)/i);
    const confidenceMatch = responseText.match(/Confidence:\s*(\d+)/i);
    
    feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
    score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 80;
    
    // Validate the response
    const gradingSchema = createGradingSchema(request.maxPoints);
    const validatedResponse = gradingSchema.parse({ 
      score, 
      feedback, 
      confidence: Math.min(confidence, 100) 
    });
    
    return validatedResponse;
    
  } catch (error) {
    console.error('Grading error:', error);
    
    // Enhanced error handling with specific fallback strategies
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      // If score is out of range, clamp it
      const clampedScore = Math.max(0, Math.min(request.maxPoints, score || 0));
      return {
        score: clampedScore,
        feedback: feedback || "Grading validation error. Please review your answer.",
        confidence: 50
      };
    }
    
    return fallbackGrading(request);
  }
}

// Batch grading with improved error handling and rate limiting
export async function gradeMultipleQuestions(requests: GradingRequest[]): Promise<GradingResponse[]> {
  const results: GradingResponse[] = [];
  const batchSize = 10; // Process in smaller batches for better error handling
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    
    try {
      const batchPromises = batch.map(async (request, index) => {
        try {
          // Stagger requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, index * 150));
          const result = await gradeShortAnswer(request);
          return result;
        } catch (error) {
          console.error(`Error grading question ${request.question}:`, error);
          return fallbackGrading(request);
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
    } catch (error) {
      console.error(`Batch processing error:`, error);
      // Fallback for entire batch
      const fallbackResults = batch.map(request => fallbackGrading(request));
      results.push(...fallbackResults);
    }
    
    // Add delay between batches
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// Utility function to calculate overall quiz statistics
export function calculateQuizStatistics(gradingResults: GradingResponse[]) {
  const totalScore = gradingResults.reduce((sum, result) => sum + result.score, 0);
  const totalConfidence = gradingResults.reduce((sum, result) => sum + (result.confidence || 80), 0);
  const averageConfidence = totalConfidence / gradingResults.length;
  
  return {
    totalScore,
    questionCount: gradingResults.length,
    averageConfidence: Math.round(averageConfidence),
    gradingQuality: averageConfidence > 80 ? 'High' : averageConfidence > 60 ? 'Medium' : 'Low'
  };
} 