/**
 * Legacy `course_materials` retirement scaffolding — dual-read only.
 * Do not drop legacy tables from here.
 *
 * Env:
 * - `LEGACY_MATERIALS_READ` — `dual` (default) | `library_only` | `legacy_only`
 * - Scripts may pass `--legacy-materials-read=…` which sets the same env.
 */

export type LegacyMaterialsReadMode = 'dual' | 'library_only' | 'legacy_only';

export function legacyMaterialsReadMode(): LegacyMaterialsReadMode {
  const raw = (
    process.env.LEGACY_MATERIALS_READ ??
    process.env.npm_config_legacy_materials_read ??
    'dual'
  )
    .trim()
    .toLowerCase();
  if (raw === 'library_only' || raw === 'legacy_only') return raw;
  return 'dual';
}

/** Include workspace library chunks (course_knowledge_links path). */
export function includeSharedKnowledgeChunks(): boolean {
  const mode = legacyMaterialsReadMode();
  return mode === 'dual' || mode === 'library_only';
}

/** Include legacy course_material_chunks path. */
export function includeLegacyCourseMaterialChunks(): boolean {
  const mode = legacyMaterialsReadMode();
  return mode === 'dual' || mode === 'legacy_only';
}
