"use client";

import { Navbar } from "@/components/frontend/Navbar";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#030303] flex flex-col">
      <Navbar />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />
      <main className="flex flex-1 items-center justify-center z-10 px-4">
        <div className="w-full max-w-md bg-black/30 border border-white/10 rounded-xl p-8 backdrop-blur-md shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Create Your Account
          </h2>
          <SignUp path="/signup" routing="path" signInUrl="/login" />
        </div>
      </main>
    </div>
  );
}