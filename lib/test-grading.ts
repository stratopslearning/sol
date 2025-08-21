// Test file for the new dynamic grading system
import { gradeShortAnswer, GradingRequest } from './grading';

// Test cases for different point values
const testCases: GradingRequest[] = [
  {
    question: "What is strategic sourcing?",
    studentAnswer: "Strategic sourcing is a long-term approach to procurement that focuses on building relationships with suppliers and optimizing costs over time.",
    correctAnswer: "Strategic sourcing is a comprehensive approach to procurement that involves analyzing spending patterns, identifying opportunities for consolidation, and developing long-term supplier relationships to achieve cost savings and quality improvements.",
    maxPoints: 5,
    questionType: 'SHORT_ANSWER'
  },
  {
    question: "Explain the difference between centralized and decentralized procurement.",
    studentAnswer: "Centralized procurement means all purchasing decisions are made from one location, while decentralized means each department makes their own decisions.",
    correctAnswer: "Centralized procurement consolidates all purchasing decisions under a single authority, enabling better negotiation power, standardized processes, and cost savings. Decentralized procurement allows individual departments or locations to make purchasing decisions independently, providing flexibility and local responsiveness but potentially missing economies of scale.",
    maxPoints: 10,
    questionType: 'SHORT_ANSWER'
  },
  {
    question: "What is maverick spend?",
    studentAnswer: "I don't know what maverick spend is.",
    correctAnswer: "Maverick spend refers to purchases made outside of established procurement processes or supplier contracts, often resulting in higher costs and missed volume discounts.",
    maxPoints: 3,
    questionType: 'SHORT_ANSWER'
  }
];

// Test function
export async function testDynamicGrading() {
  console.log('🧪 Testing Dynamic Grading System\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📝 Test Case ${i + 1}: ${testCase.question}`);
    console.log(`📊 Max Points: ${testCase.maxPoints}`);
    console.log(`👤 Student Answer: ${testCase.studentAnswer.substring(0, 100)}...`);
    console.log(`✅ Sample Answer: ${testCase.correctAnswer?.substring(0, 100)}...`);
    
    try {
      const result = await gradeShortAnswer(testCase);
      console.log(`🎯 Score: ${result.score}/${testCase.maxPoints}`);
      console.log(`💬 Feedback: ${result.feedback}`);
      console.log(`🎲 Confidence: ${result.confidence}%`);
      console.log(`📈 Percentage: ${Math.round((result.score / testCase.maxPoints) * 100)}%`);
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
    
    console.log('─'.repeat(80));
  }
}

// Export for use in other files
export { testCases };
