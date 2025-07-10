'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye,
  FileText,
  Clock,
  Users,
  Target
} from 'lucide-react';

interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  points: number;
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  maxAttempts: number;
  timeLimit?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  passingScore?: number | null;
  isActive: boolean;
  questions: Question[];
  course?: {
    id: string;
    title: string;
  } | null;
}

interface Course {
  id: string;
  title: string;
}

interface QuizEditFormProps {
  quiz: Quiz;
  courses: Course[];
}

export function QuizEditForm({ quiz, courses }: QuizEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    title: quiz.title,
    description: quiz.description || '',
    courseId: quiz.courseId || 'global',
    maxAttempts: quiz.maxAttempts,
    timeLimit: quiz.timeLimit || 30,
    startDate: quiz.startDate ? new Date(quiz.startDate).toISOString().split('T')[0] : '',
    endDate: quiz.endDate ? new Date(quiz.endDate).toISOString().split('T')[0] : '',
    passingScore: quiz.passingScore || 70,
    isActive: quiz.isActive,
  });

  const [questions, setQuestions] = useState<Question[]>(quiz.questions);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      order: questions.length + 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options[optionIndex] = value;
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options };
    setQuestions(updatedQuestions);
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/professor/quiz/${quiz.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          questions: questions.map((q, index) => ({
            ...q,
            order: index + 1,
          })),
        }),
      });

      if (response.ok) {
        router.push(`/dashboard/professor/quizzes?success=true&quizId=${quiz.id}`);
      } else {
        throw new Error('Failed to update quiz');
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      // Handle error (show toast, etc.)
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
    <div className="space-y-8">
      {/* Progress Steps */}
      <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                getStepStatus(1) === 'completed' ? 'bg-green-600' : 
                getStepStatus(1) === 'current' ? 'bg-blue-600' : 'bg-white/20'
              }`}>
                <span className="text-sm font-medium text-white">1</span>
              </div>
              <span className={`text-sm font-medium ${
                getStepStatus(1) === 'current' ? 'text-white' : 'text-white/60'
              }`}>Quiz Settings</span>
            </div>
            <div className="flex-1 h-px bg-white/20 mx-4" />
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                getStepStatus(2) === 'completed' ? 'bg-green-600' : 
                getStepStatus(2) === 'current' ? 'bg-blue-600' : 'bg-white/20'
              }`}>
                <span className="text-sm font-medium text-white">2</span>
              </div>
              <span className={`text-sm font-medium ${
                getStepStatus(2) === 'current' ? 'text-white' : 'text-white/60'
              }`}>Questions</span>
            </div>
            <div className="flex-1 h-px bg-white/20 mx-4" />
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                getStepStatus(3) === 'completed' ? 'bg-green-600' : 
                getStepStatus(3) === 'current' ? 'bg-blue-600' : 'bg-white/20'
              }`}>
                <span className="text-sm font-medium text-white">3</span>
              </div>
              <span className={`text-sm font-medium ${
                getStepStatus(3) === 'current' ? 'text-white' : 'text-white/60'
              }`}>Review & Save</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Quiz Settings */}
      {currentStep === 1 && (
        <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quiz Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Quiz Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter quiz title"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseId" className="text-white">Course</Label>
                <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global Quiz (No Course)</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter quiz description (optional)"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxAttempts" className="text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Max Attempts
                </Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit" className="text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Limit (min)
                </Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  max="180"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingScore" className="text-white flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Passing Score (%)
                </Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Quiz Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <span className="text-white text-sm">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-white">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-white">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Questions */}
      {currentStep === 2 && (
        <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Questions ({questions.length})
              </span>
              <Button onClick={addQuestion} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id} className="bg-white/5 border border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Question {index + 1}</h3>
                    <div className="flex items-center gap-2">
                      <Select
                        value={question.type}
                        onValueChange={(value: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER') => 
                          updateQuestion(index, 'type', value)
                        }
                      >
                        <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                          <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                          <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Question Text</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        placeholder="Enter your question"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        rows={2}
                      />
                    </div>

                    {question.type === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-2">
                        <Label className="text-white">Options</Label>
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateQuestionOption(index, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuestion(index, 'correctAnswer', option)}
                              className={`text-white hover:text-white hover:bg-white/10 ${
                                question.correctAnswer === option ? 'bg-green-600/20 text-green-400' : ''
                              }`}
                            >
                              Correct
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(question.type === 'TRUE_FALSE' || question.type === 'SHORT_ANSWER') && (
                      <div className="space-y-2">
                        <Label className="text-white">Correct Answer</Label>
                        <Input
                          value={question.correctAnswer || ''}
                          onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                          placeholder={question.type === 'TRUE_FALSE' ? 'True or False' : 'Enter correct answer'}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-white">Points</Label>
                      <Input
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                        className="bg-white/10 border-white/20 text-white w-24"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-white/40" />
                <h3 className="text-lg font-medium text-white mb-2">No questions yet</h3>
                <p className="text-white/60 mb-6">Add your first question to get started</p>
                <Button onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Question
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Save */}
      {currentStep === 3 && (
        <Card className="rounded-xl shadow-lg bg-white/10 border border-white/10">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Review & Save
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Quiz Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">Title:</span>
                    <span className="text-white font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Course:</span>
                    <span className="text-white font-medium">
                      {formData.courseId === 'global' ? 'Global Quiz' : 
                       courses.find(c => c.id === formData.courseId)?.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Status:</span>
                    <Badge className={formData.isActive ? "bg-green-600/20 text-green-400 border-green-600" : "bg-gray-600/20 text-gray-300 border-gray-600"}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Max Attempts:</span>
                    <span className="text-white font-medium">{formData.maxAttempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Time Limit:</span>
                    <span className="text-white font-medium">{formData.timeLimit} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Passing Score:</span>
                    <span className="text-white font-medium">{formData.passingScore}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Questions Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Questions:</span>
                    <span className="text-white font-medium">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Multiple Choice:</span>
                    <span className="text-white font-medium">
                      {questions.filter(q => q.type === 'MULTIPLE_CHOICE').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">True/False:</span>
                    <span className="text-white font-medium">
                      {questions.filter(q => q.type === 'TRUE_FALSE').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Short Answer:</span>
                    <span className="text-white font-medium">
                      {questions.filter(q => q.type === 'SHORT_ANSWER').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Points:</span>
                    <span className="text-white font-medium">
                      {questions.reduce((sum, q) => sum + q.points, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {formData.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Description</h3>
                <p className="text-white/80">{formData.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {currentStep < 3 ? (
            <Button onClick={nextStep} disabled={questions.length === 0}>
              Next
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 