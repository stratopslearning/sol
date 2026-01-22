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
  
  // #region agent log
  const logDataEntry = {location:'grading.ts:152',message:'gradeShortAnswer entry',data:{hasStudentAnswer:!!request.studentAnswer,hasCorrectAnswer:!!request.correctAnswer,correctAnswerLength:request.correctAnswer?.length||0,maxPoints:request.maxPoints},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
  console.log('[DEBUG]', JSON.stringify(logDataEntry));
  fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataEntry)}).catch(()=>{});
  // #endregion
  
  try {
    // Input validation
    if (!request.studentAnswer || request.studentAnswer.trim().length === 0) {
      // #region agent log
      const logDataEmpty = {location:'grading.ts:159',message:'Empty student answer - returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
      console.log('[DEBUG]', JSON.stringify(logDataEmpty));
      fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataEmpty)}).catch(()=>{});
      // #endregion
      return {
        score: 0,
        feedback: 'Please read the textbook and try again.',
        confidence: 100
      };
    }
    
    // Critical: correctAnswer is required for accurate grading
    if (!request.correctAnswer || request.correctAnswer.trim().length === 0) {
      // #region agent log
      const logDataMissing = {location:'grading.ts:168',message:'correctAnswer missing - returning early',data:{correctAnswer:request.correctAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
      console.log('[DEBUG]', JSON.stringify(logDataMissing));
      fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataMissing)}).catch(()=>{});
      // #endregion
      console.warn('correctAnswer is missing - cannot provide accurate grading');
      return {
        score: 0,
        feedback: 'Grading unavailable: Reference answer not provided. Please contact your instructor.',
        confidence: 0
      };
    }
    
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    // #region agent log
    const logDataApiKey = {location:'grading.ts:177',message:'Checking API key',data:{hasApiKey,apiKeyLength:process.env.OPENAI_API_KEY?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
    console.log('[DEBUG]', JSON.stringify(logDataApiKey));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataApiKey)}).catch(()=>{});
    // #endregion
    
    if (!hasApiKey) {
      // #region agent log
      const logDataFallback = {location:'grading.ts:178',message:'API key missing - using fallback',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
      console.log('[DEBUG]', JSON.stringify(logDataFallback));
      fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataFallback)}).catch(()=>{});
      // #endregion
      console.warn('OpenAI API key not configured, using fallback grading');
      return fallbackGrading(request);
    }
    
    // Rate limiting for scalability (basic implementation)
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between requests
    
    const prompt = createGradingPrompt(request);
    // #region agent log
    const logDataBefore = {location:'grading.ts:185',message:'Before OpenAI API call',data:{model:'gpt-5-mini',promptLength:prompt.length,hasCorrectAnswer:!!request.correctAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    console.log('[DEBUG]', JSON.stringify(logDataBefore));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataBefore)}).catch(()=>{});
    // #endregion
    
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
      // gpt-5-mini parameters:
      // - temperature: NOT supported (must be omitted)
      // - max_completion_tokens: Required (replaces max_tokens)
      // - reasoning_effort: Optional (low/medium/high) - using "medium" for balanced accuracy/speed
      max_completion_tokens: 800,
      reasoning_effort: 'medium', // Balanced reasoning for accurate grading
      response_format: { type: 'text' }
    });
    
    // #region agent log
    const logDataSuccess = {location:'grading.ts:201',message:'OpenAI API call succeeded',data:{hasResponse:!!completion.choices[0]?.message?.content,responseLength:completion.choices[0]?.message?.content?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    console.log('[DEBUG]', JSON.stringify(logDataSuccess));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataSuccess)}).catch(()=>{});
    // #endregion
    
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      // #region agent log
      const logDataNoResponse = {location:'grading.ts:204',message:'No response text from OpenAI',data:{completion:JSON.stringify(completion)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('[DEBUG]', JSON.stringify(logDataNoResponse));
      fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataNoResponse)}).catch(()=>{});
      // #endregion
      throw new Error('No response from OpenAI');
    }
    
    // Enhanced parsing with confidence score
    // #region agent log
    const logDataParsing = {location:'grading.ts:208',message:'Parsing OpenAI response',data:{responseText:responseText.substring(0,200),responseLength:responseText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'};
    console.log('[DEBUG]', JSON.stringify(logDataParsing));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataParsing)}).catch(()=>{});
    // #endregion
    
    const feedbackMatch = responseText.match(/Feedback:\s*(.*?)(?=\n|$)/i);
    const scoreMatch = responseText.match(/Score:\s*(\d+)/i);
    const confidenceMatch = responseText.match(/Confidence:\s*(\d+)/i);
    
    // #region agent log
    const logDataRegex = {location:'grading.ts:212',message:'Regex match results',data:{hasFeedbackMatch:!!feedbackMatch,hasScoreMatch:!!scoreMatch,hasConfidenceMatch:!!confidenceMatch,scoreMatchValue:scoreMatch?.[1]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'};
    console.log('[DEBUG]', JSON.stringify(logDataRegex));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataRegex)}).catch(()=>{});
    // #endregion
    
    feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
    score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 80;
    
    // Validate the response
    const gradingSchema = createGradingSchema(request.maxPoints);
    // #region agent log
    const logDataValidation = {location:'grading.ts:219',message:'Before schema validation',data:{score,feedbackLength:feedback.length,confidence,maxPoints:request.maxPoints},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'};
    console.log('[DEBUG]', JSON.stringify(logDataValidation));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataValidation)}).catch(()=>{});
    // #endregion
    
    const validatedResponse = gradingSchema.parse({ 
      score, 
      feedback, 
      confidence: Math.min(confidence, 100) 
    });
    
    // #region agent log
    const logDataReturn = {location:'grading.ts:225',message:'Grading successful - returning result',data:{score:validatedResponse.score,feedbackLength:validatedResponse.feedback.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    console.log('[DEBUG]', JSON.stringify(logDataReturn));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataReturn)}).catch(()=>{});
    // #endregion
    
    return validatedResponse;
    
  } catch (error) {
    // #region agent log
    const logDataError = {location:'grading.ts:227',message:'Error caught in gradeShortAnswer',data:{errorName:error?.constructor?.name,errorMessage:error instanceof Error?error.message:String(error),hasCorrectAnswer:!!request.correctAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
    console.log('[DEBUG]', JSON.stringify(logDataError));
    console.error('[DEBUG ERROR]', error);
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataError)}).catch(()=>{});
    // #endregion
    
    console.error('Grading error:', error);
    
    // Enhanced error handling with specific fallback strategies
    if (error instanceof z.ZodError) {
      // #region agent log
      const logDataZod = {location:'grading.ts:231',message:'Zod validation error',data:{errors:error.errors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'};
      console.log('[DEBUG]', JSON.stringify(logDataZod));
      fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataZod)}).catch(()=>{});
      // #endregion
      console.error('Validation error:', error.errors);
      // If score is out of range, clamp it
      const clampedScore = Math.max(0, Math.min(request.maxPoints, score || 0));
      return {
        score: clampedScore,
        feedback: feedback || "Grading validation error. Please review your answer.",
        confidence: 50
      };
    }
    
    // #region agent log
    const logDataFallback2 = {location:'grading.ts:242',message:'Using fallback grading',data:{hasCorrectAnswer:!!request.correctAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
    console.log('[DEBUG]', JSON.stringify(logDataFallback2));
    fetch('http://127.0.0.1:7244/ingest/1109f94d-80f7-49ca-87a3-95efe0645b46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logDataFallback2)}).catch(()=>{});
    // #endregion
    
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