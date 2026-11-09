'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiUrl } from '@/lib/basePath';
import {
  defaultTierForSku,
  tiersForSku,
  type WorkspaceSku,
} from '@/lib/workspace/pricing';

type Props = {
  parentOptions: { id: string; name: string }[];
};

export function WorkspacesClient({ parentOptions }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<WorkspaceSku>('department');
  const [parentId, setParentId] = useState<string>('none');
  const [tierId, setTierId] = useState(() => defaultTierForSku('department').id);
  const [seatCap, setSeatCap] = useState(() =>
    String(defaultTierForSku('department').seatCap),
  );
  const [ownerEmail, setOwnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tiers = useMemo(() => tiersForSku(type), [type]);

  /** Lowercase kebab slug. Hyphen first so HTML `pattern` is valid under unicodeSets (`v`). */
  function normalizeSlug(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function onTypeChange(next: WorkspaceSku) {
    setType(next);
    const tier = defaultTierForSku(next);
    setTierId(tier.id);
    setSeatCap(String(tier.seatCap));
    if (next !== 'department') setParentId('none');
  }

  function onTierChange(id: string) {
    setTierId(id);
    const tier = tiers.find((t) => t.id === id);
    if (tier) setSeatCap(String(tier.seatCap));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setClaimUrl(null);
    try {
      const res = await fetch(apiUrl('/api/admin/workspaces'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: normalizeSlug(slug),
          name: name.trim(),
          type,
          parentWorkspaceId: parentId === 'none' ? null : parentId,
          seatCap: Number(seatCap) || undefined,
          pricingTierId: tierId,
          ownerEmail: ownerEmail.trim().toLowerCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 400
              ? 'Check slug (lowercase letters, numbers, hyphens) and owner email.'
              : 'Failed to create workspace'),
        );
        return;
      }
      setSlug('');
      setName('');
      setOwnerEmail('');
      setClaimUrl(data.invite?.claimUrl ?? null);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  async function copyClaim() {
    if (!claimUrl) return;
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="grid gap-4">
      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-lg border border-rule/70 bg-surface p-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="ws-name">Name</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="College of Engineering"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ws-slug">Slug</Label>
          <Input
            id="ws-slug"
            value={slug}
            onChange={(e) => setSlug(normalizeSlug(e.target.value))}
            required
            placeholder="engineering"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            title="Lowercase letters, numbers, and hyphens only"
          />
          <p className="text-xs text-ink-faint">
            URL id — letters, numbers, hyphens (spaces become hyphens).
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(v) => onTypeChange(v as WorkspaceSku)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="creator">Creator</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="institution">Institution</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Pricing tier</Label>
          <Select value={tierId} onValueChange={onTierChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label} · {t.seatCap.toLocaleString()} seats · $
                  {t.priceUsd.toLocaleString()}/{t.period === 'month' ? 'mo' : 'yr'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type === 'department' ? (
          <div className="grid gap-2">
            <Label>Parent institution (optional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="ws-seats">Seat cap (active learners)</Label>
          <Input
            id="ws-seats"
            type="number"
            min={1}
            value={seatCap}
            onChange={(e) => setSeatCap(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ws-owner">Owner email</Label>
          <Input
            id="ws-owner"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            placeholder="chair@university.edu"
          />
          <p className="text-xs text-ink-muted">
            Client signs in with this email, claims the workspace, then pays
            (Creator/Business) and creates courses. They never get platform
            admin.
          </p>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create workspace & invite owner'}
        </Button>
      </form>

      {claimUrl ? (
        <div className="rounded-lg border border-success/40 bg-success-soft/30 p-4">
          <p className="text-sm font-medium text-ink">Workspace created</p>
          <p className="mt-1 text-xs text-ink-muted">
            Send this claim link to the owner. It is only shown once.
          </p>
          <code className="mt-3 block break-all rounded-md border border-rule/60 bg-surface px-3 py-2 text-xs">
            {claimUrl}
          </code>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            variant="outline"
            onClick={copyClaim}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
