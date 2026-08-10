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
| Discussions | `chatbots`, `chatbot_sessions.messages` | Prompts + transcripts | Education record | Assigned students; author faculty; ADMIN |
| Grading cache | `grading_cache` | Hash key + cached model payload | Derived education content | System only |
| Audit | `audit_log` | Actor, action, target, metadata, IP | Security / FERPA disclosure log | ADMIN read-only |
| Payments | `stripe_events`, Stripe | Payment metadata | Financial (linked to user) | System / ADMIN ops |

**Outbound processors:** OpenAI receives minimized student answer text and discussion messages for grading/Socratic chat — see [`AI_EDUCATION_RECORDS.md`](./AI_EDUCATION_RECORDS.md).
