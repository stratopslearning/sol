"use client";

import type { InteractiveBody, InteractiveKind } from "@/app/db/schema";
import { InteractivePlayer } from "@/components/interactives/InteractivePlayer";

export function InteractivePreviewClient({
  kind,
  body,
  title,
}: {
  kind: InteractiveKind;
  body: InteractiveBody;
  title: string;
}) {
  return (
    <InteractivePlayer
      kind={kind}
      body={body}
      title={title}
      completed={false}
      onComplete={async () => {}}
    />
  );
}
