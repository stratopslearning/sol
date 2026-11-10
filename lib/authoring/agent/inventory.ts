import type { OutlineDetail, OutlineItemSummary } from '@/lib/authoring/outlines';

export type InventoryItem = {
  id: string;
  moduleId: string;
  moduleTitle: string;
  type: OutlineItemSummary['type'];
  title: string;
  status: OutlineItemSummary['status'];
  published: boolean;
  publishedQuizId: string | null;
  publishedChatbotId: string | null;
  publishedLessonId: string | null;
  publishedInteractiveId: string | null;
  position: number;
  orderIndex: number;
};

export type OutlineInventory = {
  outlineId: string;
  courseId: string;
  title: string;
  bodiesBuilt: boolean;
  items: InventoryItem[];
  counts: {
    total: number;
    byType: Record<string, number>;
    published: number;
    unpublished: number;
  };
  focusItemId: string | null;
  focus: InventoryItem | null;
};

export function isItemPublished(item: {
  publishedQuizId: string | null;
  publishedChatbotId: string | null;
  publishedLessonId: string | null;
  publishedInteractiveId: string | null;
}): boolean {
  return Boolean(
    item.publishedQuizId ||
      item.publishedChatbotId ||
      item.publishedLessonId ||
      item.publishedInteractiveId,
  );
}

/** Ordered inventory of outline items for grounded agent planning. */
export function buildOutlineInventory(
  detail: OutlineDetail,
  focusItemId?: string | null,
): OutlineInventory {
  const items: InventoryItem[] = [];
  let orderIndex = 0;
  for (const mod of detail.modules) {
    for (const item of mod.items) {
      items.push({
        id: item.id,
        moduleId: mod.id,
        moduleTitle: mod.title,
        type: item.type,
        title: item.title,
        status: item.status,
        published: isItemPublished(item),
        publishedQuizId: item.publishedQuizId,
        publishedChatbotId: item.publishedChatbotId,
        publishedLessonId: item.publishedLessonId,
        publishedInteractiveId: item.publishedInteractiveId,
        position: item.position,
        orderIndex: orderIndex++,
      });
    }
  }

  const byType: Record<string, number> = {};
  let published = 0;
  for (const item of items) {
    byType[item.type] = (byType[item.type] ?? 0) + 1;
    if (item.published) published += 1;
  }

  const focus =
    focusItemId != null
      ? (items.find((i) => i.id === focusItemId) ?? null)
      : null;

  return {
    outlineId: detail.id,
    courseId: detail.courseId,
    title: detail.title,
    bodiesBuilt: detail.bodiesBuilt,
    items,
    counts: {
      total: items.length,
      byType,
      published,
      unpublished: items.length - published,
    },
    focusItemId: focus?.id ?? null,
    focus,
  };
}

/** Compact JSON for the planner (no bodies — prevents stem hallucination). */
export function inventoryPlannerSnapshot(inventory: OutlineInventory): string {
  return JSON.stringify(
    {
      outlineId: inventory.outlineId,
      title: inventory.title,
      bodiesBuilt: inventory.bodiesBuilt,
      counts: inventory.counts,
      focus: inventory.focus
        ? {
            id: inventory.focus.id,
            type: inventory.focus.type,
            title: inventory.focus.title,
            published: inventory.focus.published,
          }
        : null,
      items: inventory.items.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        moduleTitle: i.moduleTitle,
        published: i.published,
        status: i.status,
        orderIndex: i.orderIndex,
      })),
    },
    null,
    0,
  );
}

export function inventoryHumanSummary(inventory: OutlineInventory): string {
  const lines = [
    `### ${inventory.title}`,
    '',
    `**${inventory.counts.total}** items · **${inventory.counts.published}** published drafts · **${inventory.counts.unpublished}** unpublished`,
    '',
    '#### By type',
    '',
  ];
  for (const [type, n] of Object.entries(inventory.counts.byType)) {
    lines.push(`- **${type}** — ${n}`);
  }
  if (inventory.focus) {
    lines.push(
      '',
      '#### Focus',
      '',
      `- **${inventory.focus.type}** ${inventory.focus.title} (${inventory.focus.published ? 'published draft' : 'unpublished'})`,
    );
  }
  const published = inventory.items.filter((i) => i.published).slice(0, 8);
  if (published.length > 0) {
    lines.push('', '#### Published drafts', '');
    for (const item of published) {
      lines.push(`- **${item.type}** ${item.title}`);
    }
    if (inventory.counts.published > published.length) {
      lines.push(
        `- … +${inventory.counts.published - published.length} more`,
      );
    }
  }
  return lines.join('\n');
}
