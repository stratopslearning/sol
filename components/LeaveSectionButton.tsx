"use client";

import { apiUrl } from '@/lib/basePath';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveSectionButtonProps {
  sectionId: string;
  sectionName: string;
  onSuccess?: () => void;
}

export default function LeaveSectionButton({ sectionId, sectionName, onSuccess }: LeaveSectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLeaveSection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/student/section/${sectionId}/leave`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Successfully left section');
        if (onSuccess) {
          onSuccess();
        } else {
          // Refresh the page to update the UI
          window.location.reload();
        }
      } else {
        toast.error(data.error || 'Failed to leave section');
      }
    } catch (error) {
      console.error('Error leaving section:', error);
      toast.error('Failed to leave section');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogOut className="h-4 w-4" />
          Leave section
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="eyebrow text-ink-faint">Leave</span>
          <AlertDialogTitle>Leave {sectionName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will lose access to quizzes and materials for this section. You
            can re-join later with a new code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeaveSection} disabled={isLoading}>
            {isLoading ? "Leaving…" : "Leave section"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
