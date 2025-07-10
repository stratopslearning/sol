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
  score: number;
  maxPoints: number;
  feedback: string;
  confidence: number;
  reasoning: string;
  keywords: string[];
  suggestions: string[];
}

export interface GradingError {
  error: string;
  fallbackScore: number;
  fallbackFeedback: string;
}

// Validation schema for GPT response
const gradingResponseSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(10).max(1000), // Increased from 500 to 1000
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(20).max(500), // Increased from 300 to 500
  keywords: z.array(z.string()).min(1).max(10),
  suggestions: z.array(z.string()).min(0).max(5),
});

// Enhanced prompt engineering for consistent grading
function createGradingPrompt(request: GradingRequest): string {
  const { question, studentAnswer, correctAnswer, maxPoints } = request;
  
  return `You are an expert educational AI grader. Grade the following short answer question with precision and fairness.

QUESTION: "${question}"
STUDENT ANSWER: "${studentAnswer}"
${correctAnswer ? `CORRECT ANSWER: "${correctAnswer}"` : ''}
MAXIMUM POINTS: ${maxPoints}

GRADING CRITERIA:
1. Content Accuracy (40%): Does the answer address the question correctly?
2. Completeness (30%): Does the answer cover the key points?
3. Clarity (20%): Is the answer well-expressed and understandable?
4. Originality (10%): Does the answer show independent thinking?

SCORING GUIDELINES:
- 90-100%: Excellent - Comprehensive, accurate, well-articulated
- 80-89%: Good - Mostly accurate with minor gaps
- 70-79%: Satisfactory - Generally correct but incomplete
- 60-69%: Needs Improvement - Some correct elements but significant gaps
- 50-59%: Poor - Minimal understanding shown
- 0-49%: Unsatisfactory - Incorrect or irrelevant

RESPONSE FORMAT (JSON only):
{
  "score": [0-100],
  "feedback": "Detailed, constructive feedback explaining the grade (max 800 characters)",
  "confidence": [0-100],
  "reasoning": "Brief explanation of scoring decision (max 400 characters)",
  "keywords": ["key", "concepts", "student", "should", "include"],
  "suggestions": ["specific", "improvement", "suggestions"]
}

IMPORTANT: 
- Respond with ONLY valid JSON. No additional text.
- Keep feedback concise but helpful (max 800 characters)
- Keep reasoning brief and clear (max 400 characters)`;
}

// Fallback grading logic when GPT fails
function fallbackGrading(request: GradingRequest): GradingResponse {
  const { studentAnswer, maxPoints } = request;
  
  // Basic keyword matching and length analysis
  const answerLength = studentAnswer.trim().length;
  const hasContent = answerLength > 10;
  const hasKeywords = request.question.toLowerCase().split(' ').some(word => 
    word.length > 3 && studentAnswer.toLowerCase().includes(word)
  );
  
  let score = 0;
  let feedback = '';
  
  if (!hasContent) {
    score = 0;
    feedback = 'No substantial answer provided. Please provide a detailed response addressing the question.';
  } else if (hasKeywords && answerLength > 50) {
    score = Math.min(75, maxPoints);
    feedback = 'Answer shows some understanding but could be more comprehensive. Consider including more specific details and examples.';
  } else if (hasContent) {
    score = Math.min(50, maxPoints);
    feedback = 'Answer provided but may not fully address the question. Review the question requirements and provide more specific information.';
  }
  
  return {
    score: Math.round((score / 100) * maxPoints),
    maxPoints,
    feedback,
    confidence: 60,
    reasoning: 'Fallback grading based on content analysis',
    keywords: [],
    suggestions: ['Provide more specific examples', 'Address all parts of the question', 'Use clear, concise language']
  };
}

// Main grading function with comprehensive error handling
export async function gradeShortAnswer(request: GradingRequest): Promise<GradingResponse> {
  try {
    // Validate input
    if (!request.studentAnswer || request.studentAnswer.trim().length === 0) {
      return {
        score: 0,
        maxPoints: request.maxPoints,
        feedback: 'No answer provided.',
        confidence: 100,
        reasoning: 'Empty answer automatically receives zero points',
        keywords: [],
        suggestions: ['Please provide a complete answer to the question']
      };
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using fallback grading');
      return fallbackGrading(request);
    }

    // Create the grading prompt
    const prompt = createGradingPrompt(request);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational AI grader. Provide fair, consistent, and constructive feedback. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent grading
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate the response structure
    let validatedResponse;
    try {
      validatedResponse = gradingResponseSchema.parse(parsedResponse);
    } catch (validationError) {
      console.error('Validation error for GPT response:', validationError);
      console.error('Raw response:', parsedResponse);
      
      // Try to extract what we can from the response
      const fallbackResponse = {
        score: Math.min(100, Math.max(0, parsedResponse.score || 50)),
        feedback: (parsedResponse.feedback || 'Feedback provided but validation failed').substring(0, 800),
        confidence: Math.min(100, Math.max(0, parsedResponse.confidence || 60)),
        reasoning: (parsedResponse.reasoning || 'Reasoning provided but validation failed').substring(0, 400),
        keywords: Array.isArray(parsedResponse.keywords) ? parsedResponse.keywords.slice(0, 10) : [],
        suggestions: Array.isArray(parsedResponse.suggestions) ? parsedResponse.suggestions.slice(0, 5) : []
      };
      
      validatedResponse = fallbackResponse;
    }

    // Convert percentage score to actual points
    const actualScore = Math.round((validatedResponse.score / 100) * request.maxPoints);

    return {
      score: actualScore,
      maxPoints: request.maxPoints,
      feedback: validatedResponse.feedback,
      confidence: validatedResponse.confidence,
      reasoning: validatedResponse.reasoning,
      keywords: validatedResponse.keywords,
      suggestions: validatedResponse.suggestions
    };

  } catch (error) {
    console.error('Grading error:', error);
    
    // Return fallback grading with error information
    const fallback = fallbackGrading(request);
    fallback.feedback = `Grading temporarily unavailable. ${fallback.feedback}`;
    fallback.confidence = 40;
    fallback.reasoning = 'Fallback grading used due to technical issues';
    
    return fallback;
  }
}

// Batch grading for multiple questions
export async function gradeMultipleQuestions(requests: GradingRequest[]): Promise<GradingResponse[]> {
  const results: GradingResponse[] = [];
  
  // Process questions sequentially to avoid rate limits
  for (const request of requests) {
    try {
      const result = await gradeShortAnswer(request);
      results.push(result);
      
      // Add small delay between requests to respect rate limits
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
  const totalMaxScore = gradingResults.reduce((sum, result) => sum + result.maxPoints, 0);
  const averageConfidence = gradingResults.reduce((sum, result) => sum + result.confidence, 0) / gradingResults.length;
  
  return {
    totalScore,
    totalMaxScore,
    percentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
    averageConfidence: Math.round(averageConfidence),
    questionCount: gradingResults.length
  };
} 