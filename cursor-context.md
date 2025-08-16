# 🧠 Cursor AI Context: S-O-L LMS Project

You are working on a full-stack AI-powered LMS-style quiz application called **S-O-L**.

---

## 🎯 Purpose
To monetize free textbooks by offering GPT-graded quizzes:
- Students sign up, pay once, and unlock access to quizzes
- Professors assign quizzes through LMS platforms (e.g. Canvas)
- Quizzes are automatically graded using GPT
- Admins manage platform usage, users, and quizzes

---

## 🧱 Tech Stack
- **Framework:** Next.js (App Router)
- **Database:** Neon Postgres
- **ORM:** Drizzle ORM
- **Auth:** Clerk (sign-in/sign-up only)
- **Source of Truth:** NeonDB via Drizzle (`users` table stores roles + payment)
- **AI:** OpenAI GPT-4 for grading short-answer questions
- **Payments:** Stripe (one-time checkout per student)
- **Styling:** TailwindCSS + ShadCN UI
- **Hosting:** Vercel

---

## 🔐 Authentication & User Sync
- Clerk is used *only* for sign-in and sign-up
- Upon login, a `getOrCreateUser()` function runs:
  - Retrieves Clerk user ID and email
  - Checks if user exists in `users` table (NeonDB)
  - If not, creates a record with `role = STUDENT` and `paid = false`
- All access control is based on `users` table, **not Clerk claims**

---

## 🧠 GPT Grading Flow
- Quizzes include MCQ, T/F, and short-answer
- On submission:
  - Short answers sent to GPT API
  - GPT returns `score` + `feedback`
  - Data stored in `attempts` table
  - Student and professor can view AI feedback

---

## 💳 Payment Flow
- Students pay once via Stripe Checkout
- On success, webhook updates `users.paid = true`
- Professors and Admins are not charged
- Middleware guards student access to `/quiz/*` and `/dashboard/student`

---

## 🧑‍🏫 Roles (NeonDB via Drizzle)
- Stored in `users.role`
- Values: `STUDENT`, `PROFESSOR`, `ADMIN`
- Middleware uses role & paid status to allow/restrict access

---

## 📂 File Structure (Key Pages)

```
/app
  /page.tsx                → Landing page (HeroGeometric)
  /login/page.tsx          → Clerk SignIn (gradient bg, no shapes)
  /signup/page.tsx         → Clerk SignUp (same layout)
  /payment/page.tsx        → Stripe checkout page
  /quiz/[quizId]/page.tsx  → Quiz interface
  /dashboard/student/      → Quiz dashboard + results
  /dashboard/professor/    → Quiz management
  /dashboard/admin/        → Admin tools
/api
  /stripe/webhook          → Handles Stripe payment event
  /quiz/[quizId]/grade     → GPT grading endpoint

/db/schema/
  users.ts, quizzes.ts, courses.ts, questions.ts, assignments.ts, attempts.ts

/lib/
  getOrCreateUser.ts, stripe.ts, grading.ts, auth.ts
```

---

## 🚀 Example User Flow
1. Professor shares a quiz link via LMS
2. Student clicks → redirected to Clerk `/login`
3. On login, `getOrCreateUser()` syncs data to NeonDB
4. If unpaid → redirected to `/payment`
5. After Stripe checkout → `users.paid = true`
6. Student accesses quiz → GPT grades → feedback shown

---

## 🧠 AI Guidance
Act like a senior full-stack developer building this LMS. When asked:
- Use Drizzle + NeonDB for all role/payment logic
- Use Clerk **only** for auth (sign-in/sign-up/session)
- Avoid using Clerk claims or metadata for access control
- Apply Stripe, GPT, and route protections according to this model
