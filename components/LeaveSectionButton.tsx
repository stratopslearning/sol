"use client";

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
      const response = await fetch(`/api/student/section/${sectionId}/leave`, {
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
        <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
          <LogOut className="w-4 h-4 mr-2" />
          Leave Section
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#18181b] border border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Leave Section</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60">
            Are you sure you want to leave <strong>{sectionName}</strong>? 
            You will lose access to all quizzes and materials for this section.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLeaveSection}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? 'Leaving...' : 'Leave Section'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 