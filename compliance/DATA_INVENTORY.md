# Education-record data inventory

Default classification: **education record** (not directory information) for all LMS academic data.

| Store | Table / location | Contents | Classification | Access |
| --- | --- | --- | --- | --- |
| Identity | `users` | clerkId, email, names, role, paid, stripeCustomerId | Education / account | Self; ADMIN manage |
| Student enrollment | `student_sections` | studentId, sectionId, status | Education record | Student self; section faculty; ADMIN |
| Faculty assignment | `professor_sections` | professorId, sectionId | Education / operational | Professor self; ADMIN |
| Courses / sections | `courses`, `sections` | Catalog, enrollment codes | Operational (codes are secrets) | Role-gated |
| Quizzes / questions | `quizzes`, `questions` | Stems, keys, rubrics | Education / assessment | Author + ADMIN; students get stems only |
| Attempts / grades | `attempts` | answers JSON, score, gptFeedback, status | Education record | Owner student; section faculty; ADMIN |
| Question concept tags | `questions.concept_tags` | Short instructional topic slugs (from Authoring) | Instructional metadata | Section faculty; ADMIN; input to Analytics concept rollup |
| Analytics (computed) | No dedicated tables — live views over attempts + `lesson_progress` + tags | Concept success rates / gaps; lesson never-started / started / completed vs roster | Derived education record | Teaching faculty for course (same section visibility as gradebook/results); ADMIN; audited as `professor.analytics.view` |
| Grading materials context | Ephemeral prompt context (not stored) | Retrieved course-material excerpts used only to clarify terminology while grading SA | Instructional (derived) | System → OpenAI for grading; reference answer remains authoritative |
| Discussions | `chatbots`, `chatbot_sessions.messages` | Prompts + transcripts | Education record | Assigned students; author faculty; ADMIN |
| Course materials (legacy + books) | `course_materials`, `course_material_chunks`; S3 objects | Titles, source URLs/keys, extracted text chunks, embeddings | Education / instructional content | Teaching faculty for course (invite/coordinator); ADMIN; students receive retrieved excerpts only via tutor |
| Shared Knowledge library | `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`; S3 objects | Titles, versions, visibility (`personal`/`workspace`), chunks, embeddings | Education / instructional content | Workspace faculty (personal: creator + coordinators); coordinators mutate shared library |
| Course Knowledge attachments | `course_knowledge_links` | Course↔document links, pinned version, pending update version, authoring corpus | Instructional linkage metadata | Teaching faculty for course; ADMIN |
| Knowledge connectors | `knowledge_connectors`, `knowledge_sync_runs` | OAuth tokens (encrypted), sync status | Integration credentials | Workspace coordinators |
| Course authoring | `course_outlines`, `outline_modules`, `outline_items`, `authoring_messages` | AI-drafted outline/lesson/quiz/discussion bodies; refine chat; links to published quiz/discussion/lesson ids | Education / instructional content | Teaching faculty for course; ADMIN; students only after Release |
| Course lessons (Learning) | `lessons`, `lesson_sections`, `flashcards`, `lesson_progress` | Released lesson markdown, flashcards, per-student progress | Education / instructional content | Assigned students (active lessons); teaching faculty; ADMIN; tutor may inject short excerpts |
| Grading cache | `grading_cache` | Hash key + cached model payload | Derived education content | System only |
| Audit | `audit_log` | Actor, action, target, metadata, IP | Security / FERPA disclosure log | ADMIN read-only |
| Agent tokens | `professor_api_tokens` | Token hash, prefix, scopes, usage timestamps (no plaintext) | Credential / security | Owner professor; see [MCP_AGENT_ACCESS.md](./MCP_AGENT_ACCESS.md) |
| Payments | `stripe_events`, Stripe | Payment metadata | Financial (linked to user) | System / ADMIN ops |
| Canvas LTI (optional) | `lti_platforms`, `lti_deployments`, `lti_section_links`, `lti_user_links`, `lti_line_items`, `lti_passback_jobs` | Canvas course/section ids, LTI user subs, AGS line item URLs, score passback job state | Education record / operational | Section faculty (link UI); ADMIN (deployment view); system → Canvas AGS/NRPS when `LTI_ENABLED=true` |

**Outbound processors:** OpenAI receives minimized student answer text and discussion messages for grading/Socratic chat — see [`AI_EDUCATION_RECORDS.md`](./AI_EDUCATION_RECORDS.md). Braintrust (when enabled) receives the same minimized LLM prompt/completion traces plus MCP tool metadata — see Braintrust section in that doc. When Canvas LTI is enabled, AGS may receive student scores/completion and NRPS may receive roster membership for linked sections — see [content/docs/canvas-lti.md](../content/docs/canvas-lti.md).
