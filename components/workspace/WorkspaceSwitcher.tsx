'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { withBasePath } from '@/lib/basePath';

export type WorkspaceSwitcherOption = {
  id: string;
  name: string;
};

type Props = {
  memberships: WorkspaceSwitcherOption[];
  activeWorkspaceId: string;
};

export function WorkspaceSwitcher({ memberships, activeWorkspaceId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (memberships.length <= 1) return null;

  return (
    <Select
      value={activeWorkspaceId}
      disabled={pending}
      onValueChange={(workspaceId) => {
        startTransition(async () => {
          await fetch(withBasePath('/api/workspace/active'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId }),
          });
          router.refresh();
        });
      }}
    >
      <SelectTrigger
        className="h-8 w-auto max-w-[11rem] min-w-0 shrink text-xs"
        aria-label="Active workspace"
      >
        <SelectValue placeholder="Workspace" />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
