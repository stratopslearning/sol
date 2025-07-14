"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  CheckCircle,
  AlertCircle,
  Upload,
  CalendarIcon
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import CourseMultiSelect from '@/components/CourseMultiSelect';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { SectionMultiSelect } from '@/components/ui/SectionMultiSelect';

// Form validation schemas
const quizBasicSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  maxAttempts: z.number().min(1, 'Max attempts must be at least 1').max(10, 'Max attempts cannot exceed 10'),
  timeLimit: z.number().min(1, 'Time limit must be at least 1 minute').max(180, 'Time limit cannot exceed 3 hours'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

const questionSchema = z.object({
  question: z.string().min(1, 'Question text is required'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
  points: z.number().min(1, 'Points must be at least 1'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
});

const quizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  maxAttempts: z.number().min(1, 'Max attempts must be at least 1').max(10, 'Max attempts cannot exceed 10'),
  timeLimit: z.number().min(1, 'Time limit must be at least 1 minute').max(180, 'Time limit cannot exceed 3 hours'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type QuizFormData = z.infer<typeof quizSchema>;

interface Section {
  id: string;
  title: string;
  description?: string | null;
}

interface QuizCreationFormProps {
  courses: Section[]; // Keep the prop name for backward compatibility but it's actually sections
  apiEndpoint?: string;
}

export function QuizCreationForm({ courses, apiEndpoint }: QuizCreationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      maxAttempts: 1,
      timeLimit: 30,
      startDate: undefined,
      endDate: undefined,
      questions: [
        {
          question: '',
          type: 'MULTIPLE_CHOICE',
          points: 1,
          options: ['', '', '', ''],
          correctAnswer: '',
        },
      ],
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedQuestions = watch('questions');

  const addQuestion = () => {
    const currentQuestions = getValues('questions');
    setValue('questions', [
      ...currentQuestions,
      {
        question: '',
        type: 'MULTIPLE_CHOICE',
        points: 1,
        options: ['', '', '', ''],
        correctAnswer: '',
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    const currentQuestions = getValues('questions');
    if (currentQuestions.length > 1) {
      setValue('questions', currentQuestions.filter((_: any, i: number) => i !== index));
    }
  };

  const updateQuestionOptions = (questionIndex: number, optionIndex: number, value: string) => {
    const currentQuestions = getValues('questions');
    const updatedQuestions = [...currentQuestions];
    if (updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options![optionIndex] = value;
      setValue('questions', updatedQuestions);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setCsvError('CSV must have at least a header row and one question');
          return;
        }

        const questions: any[] = [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Validate headers
        const requiredHeaders = ['question', 'type', 'options', 'correct_answer'];
        const optionalHeaders = ['points'];
        const allHeaders = [...requiredHeaders, ...optionalHeaders];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          setCsvError(`Missing required headers: ${missingHeaders.join(', ')}`);
          return;
        }

        // Parse questions
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const questionIndex = headers.indexOf('question');
          const typeIndex = headers.indexOf('type');
          const optionsIndex = headers.indexOf('options');
          const correctAnswerIndex = headers.indexOf('correct_answer');
          const pointsIndex = headers.indexOf('points');

          const question = values[questionIndex];
          const type = values[typeIndex]?.toUpperCase();
          const optionsStr = values[optionsIndex];
          const correctAnswer = values[correctAnswerIndex];
          const pointsRaw = pointsIndex !== -1 ? values[pointsIndex] : undefined;
          let points = 1;
          if (pointsRaw && !isNaN(Number(pointsRaw)) && Number(pointsRaw) > 0) {
            points = Number(pointsRaw);
          }

          if (!question || !type) {
            setCsvError(`Row ${i + 1}: Missing question or type`);
            return;
          }

          if (!['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'].includes(type)) {
            setCsvError(`Row ${i + 1}: Invalid type. Must be MULTIPLE_CHOICE, TRUE_FALSE, or SHORT_ANSWER`);
            return;
          }

          let options: string[] = [];
          if (type === 'MULTIPLE_CHOICE' && optionsStr) {
            options = optionsStr.split('|').map(opt => opt.trim()).filter(opt => opt);
            if (options.length < 2) {
              setCsvError(`Row ${i + 1}: Multiple choice questions need at least 2 options`);
              return;
            }
          }

          questions.push({
            question,
            type,
            points,
            options: type === 'MULTIPLE_CHOICE' ? options : undefined,
            correctAnswer: correctAnswer || '',
          });
        }

        setValue('questions', questions);
        setCsvError(null);
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        setCsvError('Error parsing CSV file');
      }
    };
    reader.readAsText(file);
  };

  const onSubmit = async (data: QuizFormData) => {
    console.log('Quiz form submitted!', data);
    setIsSubmitting(true);
    
    // Check if professor has any sections available
    if (courses.length === 0) {
      toast.error('You need to be enrolled in at least one section to create quizzes.');
      setIsSubmitting(false);
      return;
    }
    
    if (sectionIds.length === 0) {
      setSectionError('Please assign the quiz to at least one section.');
      setIsSubmitting(false);
      return;
    }
    setSectionError(null);
    try {
      // Add 'order' to each question
      const questionsWithOrder = data.questions.map((q, idx) => ({ ...q, order: idx }));
      const response = await fetch(apiEndpoint || '/api/professor/quiz/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          sectionIds: sectionIds, // for admin endpoint compatibility
          questions: questionsWithOrder,
        }),
      });

      if (response.ok) {
        toast.success('Quiz created successfully!');
        if (apiEndpoint && apiEndpoint.includes('/admin/quiz/create')) {
          window.location.href = '/dashboard/admin/quizzes';
        } else {
          // fallback for professor
          router.push('/dashboard/professor/quizzes');
        }
      } else {
        throw new Error('Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {[
              { number: 1, title: 'Basic Info', icon: FileText },
              { number: 2, title: 'Questions', icon: CheckCircle },
              { number: 3, title: 'Review', icon: Eye },
            ].map((step, index) => {
              const Icon = step.icon;
              const status = getStepStatus(step.number);
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    status === 'completed' 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : status === 'current'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white/10 border-white/20 text-white/40'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    status === 'completed' 
                      ? 'text-green-400' 
                      : status === 'current'
                      ? 'text-blue-400'
                      : 'text-white/40'
                  }`}>
                    {step.title}
                  </span>
                  {index < 2 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      status === 'completed' ? 'bg-green-600' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form 
          onSubmit={e => { 
            console.log('Native form submit!'); 
            form.handleSubmit(onSubmit, (errors) => {
              console.log('React Hook Form validation errors:', errors);
            })(e); 
          }} 
          className="space-y-6"
        >
          <button type="submit" style={{ display: 'none' }}>Test Submit</button>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white">Quiz Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Quiz Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter quiz title..." 
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter quiz description..." 
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label htmlFor="sectionIds" className="text-white">Assign to Sections <span className="text-red-400">*</span></Label>
                  {courses.length === 0 ? (
                    <div className="p-4 border border-yellow-500/20 bg-yellow-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">No sections available</span>
                      </div>
                      <p className="text-xs text-yellow-300 mt-1">
                        You need to be enrolled in at least one section to create quizzes. 
                        <a href="/dashboard/professor/sections" className="text-blue-400 hover:underline ml-1">
                          Join a section
                        </a>
                      </p>
                    </div>
                  ) : (
                    <>
                      <SectionMultiSelect
                        options={courses}
                        value={sectionIds}
                        onChange={selected => {
                          setSectionIds(selected);
                          setSectionError(null);
                        }}
                        placeholder="Select sections..."
                      />
                      {sectionError && <div className="text-xs text-red-400 mt-1">{sectionError}</div>}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="maxAttempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Max Attempts *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Time Limit (minutes) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-white">Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10",
                                  !field.value && "text-white/40"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a start date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-white">End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10",
                                  !field.value && "text-white/40"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick an end date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const startDate = form.getValues('startDate');
                                return startDate ? date <= startDate : date < new Date();
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Questions */}
          {currentStep === 2 && (
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">Quiz Questions</CardTitle>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      size="sm"
                      className="shadow rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload CSV
                    </Button>
                    <Button 
                      type="button" 
                      onClick={addQuestion}
                      variant="secondary"
                      size="sm"
                      className="shadow rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                {csvError && (
                  <div className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {csvError}
                  </div>
                )}
                <div className="text-sm text-white/60">
                  CSV Format: question,type,options,correct_answer,points (points is optional, default 1)<br />
                  Types: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER<br />
                  Options: Use | to separate multiple choice options (e.g., "Option A|Option B|Option C")<br />
                  Points: (Optional) Number of points for the question (e.g., 2, 5, etc.)
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {watchedQuestions.map((question: any, questionIndex: number) => (
                  <Card key={questionIndex} className="bg-white/5 border border-white/10">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">Question {questionIndex + 1}</h3>
                        {watchedQuestions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(questionIndex)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`questions.${questionIndex}.question`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Question Text *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your question..." 
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`questions.${questionIndex}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Question Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white/10 border-white/20">
                                  <SelectItem value="MULTIPLE_CHOICE" className="text-white">Multiple Choice</SelectItem>
                                  <SelectItem value="TRUE_FALSE" className="text-white">True/False</SelectItem>
                                  <SelectItem value="SHORT_ANSWER" className="text-white">Short Answer</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`questions.${questionIndex}.points`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Points *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1" 
                                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Question Type Specific Fields */}
                      {question.type === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-4">
                          <FormLabel className="text-white">Options *</FormLabel>
                          {question.options?.map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <Input
                                placeholder={`Option ${optionIndex + 1}`}
                                value={option}
                                onChange={(e) => updateQuestionOptions(questionIndex, optionIndex, e.target.value)}
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                              />
                              <FormField
                                control={form.control}
                                name={`questions.${questionIndex}.correctAnswer`}
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <input
                                        type="radio"
                                        name={`correct-${questionIndex}`}
                                        value={option}
                                        checked={field.value === option}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className="text-blue-600"
                                      />
                                    </FormControl>
                                    <span className="text-white text-sm">Correct</span>
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'TRUE_FALSE' && (
                        <FormField
                          control={form.control}
                          name={`questions.${questionIndex}.correctAnswer`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Correct Answer *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                                    <SelectValue placeholder="Select correct answer" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white/10 border-white/20">
                                  <SelectItem value="true" className="text-white">True</SelectItem>
                                  <SelectItem value="false" className="text-white">False</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {question.type === 'SHORT_ANSWER' && (
                        <FormField
                          control={form.control}
                          name={`questions.${questionIndex}.correctAnswer`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Sample Answer (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter a sample correct answer..." 
                                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white">Review Quiz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                    <div className="space-y-2 text-white/80">
                      <p><strong>Title:</strong> {form.getValues('title')}</p>
                      <p><strong>Description:</strong> {form.getValues('description') || 'None'}</p>
                      <p><strong>Sections:</strong> {sectionIds.length === 0 ? 'None' : sectionIds.map(id => courses.find(c => c.id === id)?.title || id).join(', ')}</p>
                      <p><strong>Max Attempts:</strong> {form.getValues('maxAttempts')}</p>
                      <p><strong>Time Limit:</strong> {form.getValues('timeLimit')} minutes</p>
                      <p><strong>Start Date:</strong> {form.getValues('startDate') ? format(form.getValues('startDate')!, 'PPP') : 'None'}</p>
                      <p><strong>End Date:</strong> {form.getValues('endDate') ? format(form.getValues('endDate')!, 'PPP') : 'None'}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Questions ({watchedQuestions.length})</h3>
                    <div className="space-y-2">
                      {watchedQuestions.map((question: any, index: number) => (
                        <div key={index} className="text-white/80">
                          <p><strong>Q{index + 1}:</strong> {question.question}</p>
                          <p className="text-sm text-white/60">Type: {question.type} | Points: {question.points}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              variant="secondary"
              className={cn(
                "font-semibold rounded-lg shadow min-w-[120px] h-12 transition-all border border-white/20",
                currentStep === 1 ? "bg-gray-700 text-white/40 cursor-not-allowed opacity-60" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={courses.length === 0}
                className={cn(
                  "font-semibold rounded-lg shadow min-w-[120px] h-12 transition-all",
                  courses.length === 0 
                    ? "bg-gray-700 text-white/40 cursor-not-allowed opacity-60" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || sectionIds.length === 0 || courses.length === 0}
                className={cn(
                  "font-semibold rounded-lg shadow min-w-[120px] h-12 transition-all",
                  (isSubmitting || sectionIds.length === 0 || courses.length === 0)
                    ? "bg-gray-700 text-white/40 cursor-not-allowed opacity-60"
                    : "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Quiz
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
} 