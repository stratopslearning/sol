# 📚 Professor Login & Setup Instructions

## Overview
This guide will walk you through logging into the S-O-L LMS platform as a professor and setting up your account.

---

## 🔐 Step 1: Initial Login/Sign Up

### Option A: First Time (New Account)
1. Navigate to the platform URL (e.g., `https://your-platform.vercel.app`)
2. Click **"Sign Up"** or **"Get Started"** button
3. Choose your preferred sign-up method:
   - **Email/Password**: Enter your email and create a password
   - **Google/Microsoft**: Click the social login button
4. Complete the authentication process through Clerk
5. You will be automatically redirected after sign-up

### Option B: Existing Account
1. Navigate to the platform URL
2. Click **"Log In"** button
3. Enter your credentials (email/password or use social login)
4. You will be redirected to your dashboard

---

## 👤 Step 2: Role Assignment (Admin Required)

**Important**: By default, all new users are created as **STUDENT** role. You need an **Admin** to change your role to **PROFESSOR**.

### What Happens:
- After your first login, you'll be redirected to the student dashboard
- You won't have access to professor features yet
- Contact your platform administrator to request professor access

### Admin Process:
1. Admin logs into the admin dashboard
2. Navigates to **User Management** (`/dashboard/admin/users`)
3. Finds your account in the user list
4. Clicks **"Change Role"** button next to your name
5. Selects **"PROFESSOR"** from the dropdown
6. Your role is updated immediately

### After Role Assignment:
- Refresh your browser or log out and log back in
- You will now be redirected to `/dashboard/professor` instead of `/dashboard/student`
- You'll have access to all professor features

---

## 🎓 Step 3: Access Professor Dashboard

Once your role is set to **PROFESSOR**, you can:

1. **Navigate to**: `/dashboard/professor`
2. **You'll see**:
   - Your enrolled sections
   - Quizzes you've created
   - Student attempts and results
   - Analytics and statistics

---

## 📝 Step 4: Enroll in Sections

To start creating quizzes for a section, you need to enroll first:

1. **Get the Section Enrollment Code** from your admin
   - Each section has a unique 6-character **Professor Enrollment Code**
   - This is different from the Student Enrollment Code

2. **Enroll in a Section**:
   - Go to your Professor Dashboard
   - Look for the **"Enroll in Section"** form
   - Enter the 6-character enrollment code
   - Click **"Enroll"**

3. **Verify Enrollment**:
   - The section will appear in your dashboard
   - You can now create quizzes for that section
   - You can view student attempts from that section

---

## 🧪 Step 5: Create Your First Quiz

Once enrolled in a section:

1. Click **"Create Quiz"** or navigate to `/dashboard/professor/quiz/new`
2. Fill in quiz details:
   - **Title**: Name of your quiz
   - **Description**: Optional instructions
   - **Sections**: Select which sections this quiz is assigned to
   - **Max Attempts**: How many times students can retake
   - **Time Limit**: Optional time limit in minutes
   - **Start Date**: When quiz becomes available (optional)
   - **End Date**: When quiz closes (optional)
3. Add questions:
   - **Multiple Choice**: Add question, options, correct answer, points
   - **True/False**: Add question, select correct answer, points
   - **Short Answer**: Add question, sample answer, points (AI-graded)
4. Click **"Create Quiz"**
5. Quiz is now available to students in assigned sections

---

## 📊 Step 6: View Results & Grade

1. **View All Results**:
   - Go to **"Quiz Results"** (`/dashboard/professor/quiz-results`)
   - See all student attempts across all your quizzes

2. **View Specific Quiz Results**:
   - Click on a quiz from your dashboard
   - Click **"View Results"** or navigate to `/dashboard/professor/quiz/[quizId]/results`
   - See all student attempts for that quiz

3. **View Individual Attempt**:
   - Click on a specific attempt
   - Review student answers
   - See AI-generated feedback for short answers
   - View scores and percentages

4. **Export Results**:
   - Use the **"Export Results"** feature to download CSV files
   - Export by quiz or by section

---

## 🔧 Troubleshooting

### Issue: "Access Denied" or Redirected to Student Dashboard
**Solution**: 
- Your role hasn't been changed to PROFESSOR yet
- Contact admin to update your role
- After role change, refresh the page or log out/in

### Issue: Can't See "Enroll in Section" Form
**Solution**:
- Make sure you're logged in as PROFESSOR (not STUDENT)
- Check that you're on `/dashboard/professor`
- If still not visible, contact support

### Issue: Enrollment Code Not Working
**Solution**:
- Verify you're using the **Professor Enrollment Code** (not Student code)
- Check for typos (codes are case-sensitive)
- Ensure the section is active
- Contact admin if code is invalid

### Issue: Can't Create Quiz
**Solution**:
- Make sure you're enrolled in at least one section
- Verify you're on the professor dashboard
- Check that you've selected at least one section when creating the quiz

### Issue: Can't See Student Results
**Solution**:
- Ensure students have submitted quiz attempts
- Check that you're viewing the correct quiz
- Verify you're enrolled in the section where students took the quiz

---

## 🔑 Key URLs

- **Login**: `/login`
- **Sign Up**: `/signup`
- **Professor Dashboard**: `/dashboard/professor`
- **Create Quiz**: `/dashboard/professor/quiz/new`
- **All Quizzes**: `/dashboard/professor/quizzes`
- **Quiz Results**: `/dashboard/professor/quiz-results`
- **Sections**: `/dashboard/professor/sections`

---

## 📞 Support

If you encounter any issues:
1. Check this troubleshooting section
2. Contact your platform administrator
3. Verify your role is set to PROFESSOR in the admin panel

---

## ✅ Quick Checklist

- [ ] Signed up/Logged in successfully
- [ ] Admin changed my role to PROFESSOR
- [ ] Can access `/dashboard/professor`
- [ ] Received section enrollment code(s)
- [ ] Enrolled in at least one section
- [ ] Created first quiz
- [ ] Viewed student results

---

**Last Updated**: December 2024
