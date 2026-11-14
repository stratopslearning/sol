export function LmsToolPlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-rule/70 bg-surface px-5 py-8">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-xl text-sm text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}
