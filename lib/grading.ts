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

// Strict prompt with reference-based comparison and accuracy requirements
function createGradingPrompt(request: GradingRequest): string {
  const { question, studentAnswer, correctAnswer, maxPoints } = request;
  
  return `You are a strict business professor grading a short answer question worth ${maxPoints} points. Your grading must be accurate and precise.

REFERENCE ANSWER (THE ONLY ACCEPTABLE STANDARD):
${correctAnswer}

STUDENT ANSWER:
${studentAnswer}

CRITICAL GRADING INSTRUCTIONS:
1. The Reference Answer is the ONLY acceptable standard. Do NOT use outside knowledge, popular alternatives, or related concepts.
2. You MUST compare the student answer point-by-point with the reference answer.
3. Identify EXACTLY what the student got right and what they got wrong or missed.
4. Penalize answers that are "related but not accurate" - being close is NOT enough.
5. Vague, partially correct, or tangentially related answers should receive LOW scores.
6. Only award high scores when the student answer accurately matches the reference answer's key points, terminology, and accuracy.

REQUIRED COMPARISON PROCESS:
Before assigning a score, you MUST:
- List the specific key points, terminology, and concepts from the reference answer
- Identify which of these the student answer includes correctly
- Identify which are missing, incorrect, or vague in the student answer
- Note any inaccuracies or misunderstandings in the student answer

STRICT SCORING RUBRIC (${maxPoints} points total):
- ${maxPoints} points: EXCELLENT - Includes ALL key points, terminology, and accuracy from reference answer. No missing elements or inaccuracies.
- ${Math.round(maxPoints * 0.8)}-${maxPoints - 1} points: VERY GOOD - Missing only 1-2 minor elements, but core concepts are accurate and complete. Minor terminology gaps acceptable.
- ${Math.round(maxPoints * 0.6)}-${Math.round(maxPoints * 0.79)} points: GOOD - Missing key elements OR contains inaccuracies, but shows substantial understanding of core concepts.
- ${Math.round(maxPoints * 0.4)}-${Math.round(maxPoints * 0.59)} points: SATISFACTORY - Significant gaps or inaccuracies present. Partial understanding demonstrated, but major elements missing or incorrect.
- 1-${Math.round(maxPoints * 0.39)} points: NEEDS IMPROVEMENT - Mostly incorrect, vague, or shows minimal understanding. Most key elements missing or wrong.
- 0 points: INCORRECT - Completely incorrect, unrelated, shows no understanding, or is completely off-topic.

FEEDBACK REQUIREMENTS (Be Critical and Specific):
Your feedback MUST:
1. Identify SPECIFIC missing elements from the reference answer (not generic statements)
2. Point out SPECIFIC inaccuracies or vague statements in the student answer
3. Be constructive but honest - avoid generic praise like "well said" or "good job"
4. If the answer is wrong or vague, clearly state what was expected from the reference answer
5. Provide actionable guidance on what needs to be included or corrected

RESPONSE FORMAT:
Feedback: [your feedback here - 2-3 sentences that are specific and critical]
Score: [0 to ${maxPoints}]
Confidence: [0-100, how confident are you in this grade]

QUESTION: ${question}`;
}

// Strict fallback grading - only used when correctAnswer is unavailable or AI fails
function fallbackGrading(request: GradingRequest): GradingResponse {
  const { studentAnswer, maxPoints, correctAnswer } = request;
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
  
  // If correctAnswer is available but AI failed, be very strict
  // Only give minimal points since we can't accurately compare
  if (correctAnswer && correctAnswer.trim().length > 0) {
    return {
      score: Math.round(maxPoints * 0.2), // Only 20% - strict because we can't verify accuracy
      feedback: "Grading system temporarily unavailable. Your answer has been recorded, but accurate evaluation requires the reference answer. Please review the material to ensure your answer matches the expected response.",
      confidence: 30
    };
  }
  
  // If no correctAnswer available, use strict length-based scoring (much stricter than before)
  const answerLength = answer.length;
  const minLength = 30; // Increased minimum length requirement
  
  if (answerLength < minLength) {
    return {
      score: Math.round(maxPoints * 0.1), // Only 10% - very strict for brief answers
      feedback: "Your answer is too brief and lacks sufficient detail. Provide a more comprehensive response that demonstrates your understanding of the topic.",
      confidence: 60
    };
  }
  
  if (answerLength < minLength * 2) {
    return {
      score: Math.round(maxPoints * 0.3), // Only 30% - strict for moderate length
      feedback: "Your answer needs more depth and specificity. Include key concepts, terminology, and examples to demonstrate full understanding.",
      confidence: 50
    };
  }
  
  // Even for longer answers, be conservative without reference answer
  return {
    score: Math.round(maxPoints * 0.5), // Maximum 50% without reference answer
    feedback: "Without a reference answer for comparison, accurate grading is limited. Review the material to ensure your answer includes all required elements and is accurate.",
    confidence: 40
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
    
    // Critical: correctAnswer is required for accurate grading
    if (!request.correctAnswer || request.correctAnswer.trim().length === 0) {
      console.warn('correctAnswer is missing - cannot provide accurate grading');
      return {
        score: 0,
        feedback: 'Grading unavailable: Reference answer not provided. Please contact your instructor.',
        confidence: 0
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
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a strict and precise business professor. Your grading must be accurate, consistent, and based ONLY on the reference answer provided. Be critical and specific in your feedback. Do not give points for vague, related-but-incorrect, or partially correct answers. Always follow the exact format requested and use the strict scoring rubric provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.05, // Very low temperature for highly consistent grading
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