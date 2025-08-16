"use client";
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Plus, BookOpen } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description?: string | null;
  enrollmentCode: string;
  status: string;
  createdAt: string;
}

export default function CourseCreationForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/professor/course/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create course');
      }

      setCreatedCourse(data.course);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!createdCourse) return;
    
    try {
      await navigator.clipboard.writeText(createdCourse.enrollmentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const createAnother = () => {
    setCreatedCourse(null);
    setCopied(false);
  };

  if (createdCourse) {
    return (
      <Card className="w-full max-w-md mx-auto bg-white/10 border border-white/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <CardTitle className="text-xl text-white">Course Created Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white/80 text-sm">Course Name</Label>
            <p className="text-white font-medium">{createdCourse.title}</p>
          </div>
          
          <div>
            <Label className="text-white/80 text-sm">Enrollment Code</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600 text-lg font-mono px-3 py-2">
                {createdCourse.enrollmentCode}
              </Badge>
              <Button
                onClick={copyToClipboard}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Share this code with your students to enroll them in the course
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={createAnother} variant="outline" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Create Another Course
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white/10 border border-white/10">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-blue-400" />
        </div>
        <CardTitle className="text-xl text-white">Create New Course</CardTitle>
        <p className="text-white/60 text-sm">
          Create a course and get an enrollment code for your students
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white/80">
              Course Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mathematics 101"
              className="bg-white/5 border-white/20 text-white mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white/80">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the course..."
              className="bg-white/5 border-white/20 text-white mt-1"
              rows={3}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded p-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isCreating || !title.trim()}
            className="w-full"
          >
            {isCreating ? 'Creating Course...' : 'Create Course'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 