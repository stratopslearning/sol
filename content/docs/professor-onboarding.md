---
title: Professor onboarding
description: From first sign-up through a fully set-up teaching term. Verify your account, join sections, enroll students, and assign quizzes.
audience: faculty
order: 1
---

# Professor onboarding guide

This guide walks faculty from first account creation through a fully set-up teaching term on SOL

**Live app:** [https://www.strat-ops.net/learning](https://www.strat-ops.net/learning)

SOL is invite-only at most institutions. New accounts start as **students**. After we verify your school affiliation, we promote you to **professor** so you can join sections, author quizzes, and grade coursework.

## At a glance

| Step | Who | What happens |
| --- | --- | --- |
| 1 | You | Sign up / sign in with your **school email** |
| 2 | You | Notify us that you need professor access |
| 3 | SOL team | Verify your affiliation and change your role to **Professor** |
| 4 | SOL / admin | Create your course(s) and section(s), then share **faculty enrolment codes** |
| 5 | You | Join each section with the faculty code |
| 6 | You | Share the **learner enrolment code** with your students |
| 7 | You | Compose quizzes (and optional discussions), assign them to sections |
| 8 | You | Monitor results, gradebook, and the Attention queue |

Optional later: connect an AI agent via **Agent Access** (see [Agent Access](/docs/professor-agent-access)).

## Before you start

Have ready:

- Your **institutional email** (the address your school uses for you, e.g. `@university.edu`)
- The course / section names you will teach this term (so we can provision the catalog correctly)
- A way to reach us for verification (email or your institution’s SOL coordinator, see [Contact](#contact--support))

You do **not** need to create courses yourself. Admins create the course catalog and sections; you join sections with a faculty code.

## Step 1: Create your account (school email)

1. Open the app: [https://www.strat-ops.net/learning](https://www.strat-ops.net/learning)
2. Choose **Sign up** (or go directly to `/learning/signup`).
3. Register with your **school email**, not a personal Gmail/Outlook account when possible.
4. Complete Clerk’s sign-up flow (email verification if prompted).
5. Sign in at `/learning/login` if you already have an account.

### What you will see right after sign-in

New accounts are created as **Student** by default. That is expected. Until we promote you:

- You will land on the **student** dashboard, not the Faculty sidebar.
- You will **not** yet see Overview → My Sections → My Quizzes → Discussions, etc.

Do **not** enroll in sections as a student while waiting for professor access. Wait for the role change.

## Step 2: Notify us for verification

After you can sign in successfully, tell us you need professor access.

Include in your message:

- Full name (as it should appear to students)
- School email used to sign up (must match the account)
- Institution / department
- Courses and sections you will teach this term (titles and any section labels, e.g. “CS 101, Section A”)
- Preferred start date / term

**We will not promote an account we cannot verify.** Using your school email and listing the courses you teach speeds this up.

> **Tip for coordinators:** If your institution already has a SOL admin, they can promote you from **Dashboard → People** without waiting on an external ticket.

## Step 3: We verify you and set your role to Professor

On our side:

1. Confirm the email belongs to faculty at your institution.
2. Open **Admin → People** (`/learning/dashboard/admin/users`).
3. Find your account and use **Change role** → **Professor**.
4. (Optional) Confirm the change appears in **Audit log**.

After promotion:

1. Sign out and sign back in (or refresh and open **Open your dashboard**).
2. You should land on the **Faculty** dashboard with a **Professor** badge.
3. Sidebar items: **Overview**, **My Sections**, **My Quizzes**, **Discussions**, **All Results**, **Attention**, **Agent Access**.

If you still see the student dashboard after we confirm the change, hard-refresh or clear the session and sign in again.

## Step 4: Receive your faculty enrolment codes

Courses and sections are provisioned by an administrator (not by professors in the live product):

1. Admin creates the **course** (and sections if needed) under Admin → Courses / Sections.
2. Each section gets two codes:
   - **Faculty enrolment code**, for professors / TAs to join the section as teachers
   - **Learner enrolment code**, for students to join the section as learners
3. Someone on the SOL / registrar side sends you the **faculty** code(s) for your section(s).

Keep faculty codes private. Anyone with a faculty code can join that section as teaching faculty.

## Step 5: Join your sections

1. Open **Faculty → Overview** (`/learning/dashboard/professor`).
2. Find **Add a section**.
3. Enter the **Faculty enrolment code** (placeholder style: `PROF-XXXX`).
4. Click **Join section**.

You should see a success message like “Joined &lt;section name&gt;”.

Then open **My Sections** to confirm:

- Course title and section name
- Learner count
- Enrolment codes (you can copy the **learner** code from here or the section detail page)

Repeat for every section you teach.

### If “No sections assigned” appears

That empty state means you have not successfully joined a section yet (or codes have not been issued). Contact your SOL admin / registrar with the course name so they can confirm the faculty code.

## Step 6: Get your students enrolled

Students do **not** receive in-app email invites. You share a code out of band (syllabus, LMS announcement, email, first-day slide).

1. Open **My Sections** → the section.
2. Copy the **Learner enrolment code**.
3. Share it with students and tell them:
   1. Sign up / sign in at [https://www.strat-ops.net/learning](https://www.strat-ops.net/learning) with their school email.
   2. On their student dashboard, enter the **learner enrolment code** to join the section.
   3. Once enrolled, assigned quizzes and discussions appear for them.

Point students at the [Student getting started](/docs/student-getting-started) guide if helpful.

**Roster check:** On the section page you can see learners who have enrolled. If a student says they joined but you do not see them, have them confirm the exact code and that they used the learner code (not the faculty code).

## Step 7: Compose and assign quizzes

1. Go to **My Quizzes** or use **Compose quiz** from Overview (`/learning/dashboard/professor/quiz/new`).
2. Author questions (including short-answer items that can be AI-graded with a rubric).
3. Assign the quiz to one or more of **your enrolled sections**.
4. Publish when ready.

Students in those sections can then take the quiz. You can later:

- Edit or create an editable copy of a quiz
- Duplicate a quiz
- Archive a quiz you no longer need
- Export results to CSV

### Discussions (optional)

Under **Discussions** you can create Socratic discussion bots, assign them to sections, and review student sessions. Same pattern as quizzes: create → assign to sections you teach.

## Step 8: Teach day-to-day

| Where | Use it for |
| --- | --- |
| **Overview** | Snapshot of sections, recent submissions, Attention preview, quick actions |
| **My Sections** → section | Roster, codes, assigned work, links into gradebook |
| **Gradebook** | Section-level scores |
| **All Results** | Cross-quiz attempt overview |
| **Attention** | Attempts that need review (pending / manual / fallback grading), regrade or resolve |
| **Attempt** pages | Open a single submission, inspect AI rationale, override / regrade |

AI-graded short answers always include model reasoning so you can verify scores rather than trust them blindly. When the AI path is unavailable, deterministic fallback grading keeps the pipeline moving; those items often surface in **Attention**.

## Optional: Agent Access (AI assistants)

If you want to manage sections, quizzes, gradebooks, and discussions from an AI agent (Claude, ChatGPT, Cursor, etc.):

1. Open **Agent Access** in the Faculty sidebar.
2. Follow the [Agent Access guide](/docs/professor-agent-access) for OAuth connectors or personal access tokens.

Agent access only works while your role is **Professor** (or Admin). Downgrading the role revokes token usability.

## Checklist (print / send to faculty)

- [ ] Signed up with school email at `/learning/signup`
- [ ] Can sign in at `/learning/login`
- [ ] Notified SOL / institutional admin with name, email, courses
- [ ] Role confirmed as **Professor** (Faculty sidebar visible)
- [ ] Received faculty enrolment code(s)
- [ ] Joined each section via **Add a section**
- [ ] Copied and shared **learner** enrolment code(s) with students
- [ ] Confirmed at least one student on the roster (smoke test)
- [ ] Composed and assigned first quiz
- [ ] Know where **Attention** and **Gradebook** live
- [ ] (Optional) Set up Agent Access

## Troubleshooting

| Symptom | What to try |
| --- | --- |
| Still on student dashboard after promotion | Sign out / in; confirm the admin changed the correct email account |
| “Invalid enrollment code” when joining a section | Confirm you have the **faculty** code, not the learner code; codes are case-sensitive as issued |
| Students cannot find the course | They must enroll with the **learner** code; there is no public course directory to browse into |
| Empty My Sections | You have not joined yet, or the section was not created. Ask admin for the faculty code |
| No AI scores / items stuck in Attention | Check Attention queue; use regrade; escalate to SOL ops if grading is systemically down |
| Cannot open Faculty routes | Role is still `STUDENT`. Complete Steps 2–3 |

## Contact & support

For role verification and catalog setup, contact your institution’s SOL administrator or the SOL operations contact for your deployment.

When writing in, include the **exact school email** on the account and the **course / section** names you need.

## Related guides

- [Agent Access](/docs/professor-agent-access): connect an AI agent to your faculty workflow
- [Student getting started](/docs/student-getting-started): what to share with learners
