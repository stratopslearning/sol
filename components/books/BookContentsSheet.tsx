'use client';

import { useState } from 'react';
import { List } from '@/components/icons';

import {
  BookContentsNav,
  type BookContentsItem,
} from '@/components/books/BookContentsNav';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function BookContentsSheet({
  bookId,
  bookTitle,
  chapters,
  activeChapterId,
  sectionId,
}: {
  bookId: string;
  bookTitle: string;
  chapters: BookContentsItem[];
  activeChapterId?: string | null;
  sectionId?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="lg:hidden"
        >
          <List className="h-4 w-4" />
          Contents
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
        <SheetHeader className="border-b border-border px-4 py-3 text-left">
          <SheetTitle className="truncate text-base">{bookTitle}</SheetTitle>
        </SheetHeader>
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-3">
          <BookContentsNav
            bookId={bookId}
            bookTitle={bookTitle}
            chapters={chapters}
            activeChapterId={activeChapterId}
            sectionId={sectionId}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
