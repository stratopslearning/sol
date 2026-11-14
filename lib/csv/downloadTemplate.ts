/** Trigger a browser download of a CSV string as `filename`. */
export function downloadCsvTemplate(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const EMAIL_LIST_CSV_TEMPLATE = `email
learner@example.com
colleague@example.com
`;

export const QUIZ_QUESTIONS_CSV_TEMPLATE = `question,type,options,correct_answer,points
What is 2+2?,MULTIPLE_CHOICE,2|3|4|5,4,1
The sky is blue.,TRUE_FALSE,,true,1
Name the capital of France.,SHORT_ANSWER,,Paris,1
`;
