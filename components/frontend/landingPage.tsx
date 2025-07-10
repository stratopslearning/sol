"use client";

import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "./Navbar";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

function ElegantShape({
    className,
    delay = 0,
    width = 400,
    height = 100,
    rotate = 0,
    gradient = "from-white/[0.08]",
}: {
    className?: string;
    delay?: number;
    width?: number;
    height?: number;
    rotate?: number;
    gradient?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
            animate={{ opacity: 1, y: 0, rotate }}
            transition={{
                duration: 2.4,
                delay,
                ease: [0.23, 0.86, 0.39, 0.96],
                opacity: { duration: 1.2 },
            }}
            className={cn("absolute", className)}
        >
            <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{ width, height }}
                className="relative"
            >
                <div
                    className={cn(
                        "absolute inset-0 rounded-full",
                        "bg-gradient-to-r to-transparent",
                        gradient,
                        "backdrop-blur-[2px] border-2 border-white/[0.15]",
                        "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
                        "after:absolute after:inset-0 after:rounded-full",
                        "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
                    )}
                />
            </motion.div>
        </motion.div>
    );
}

function HeroGeometric({
    badge = "AI-Driven Quiz Platform",
    title1 = "Master Your Learning",
    title2 = "With AI-Powered Quizzes",
}: {
    badge?: string;
    title1?: string;
    title2?: string;
}) {
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
    };
    const { isSignedIn, user } = useUser();
    const [dbUser, setDbUser] = useState<any>(null);
    useEffect(() => {
        if (isSignedIn) {
            fetch('/api/user')
                .then(res => res.json())
                .then(data => setDbUser(data.user))
                .catch(err => console.error('Error fetching user:', err));
        }
    }, [isSignedIn]);

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#030303]">
            <Navbar />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

            <div className="absolute inset-0 overflow-hidden">
                <ElegantShape delay={0.3} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.15]" className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]" />
                <ElegantShape delay={0.5} width={500} height={120} rotate={-15} gradient="from-rose-500/[0.15]" className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]" />
                <ElegantShape delay={0.4} width={300} height={80} rotate={-8} gradient="from-violet-500/[0.15]" className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]" />
                <ElegantShape delay={0.6} width={200} height={60} rotate={20} gradient="from-amber-500/[0.15]" className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]" />
                <ElegantShape delay={0.7} width={150} height={40} rotate={-25} gradient="from-cyan-500/[0.15]" className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{
                            duration: 1,
                            delay: 0.5,
                            ease: "easeOut"
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12"
                    >
                        <Circle className="h-2 w-2 fill-rose-500/80" />
                        <span className="text-sm text-white/60 tracking-wide">
                            {badge}
                        </span>
                    </motion.div>

                    <motion.div
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{
                            duration: 1,
                            delay: 0.7,
                            ease: "easeOut"
                        }}
                        className="mb-6 md:mb-8"
                    >
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold tracking-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                                {title1}
                            </span>
                            <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">
                                {title2}
                            </span>
                        </h1>
                    </motion.div>

                    <motion.div
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{
                            duration: 1,
                            delay: 0.9,
                            ease: "easeOut"
                        }}
                    >
                        <p className="text-base sm:text-lg md:text-xl text-white/40 mb-8 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-4">
                            Turn any free textbook into an interactive course with auto-graded quizzes, AI feedback, and LMS integration. Students pay once. Professors teach smarter.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            {isSignedIn ? (
                                dbUser && dbUser.role === 'STUDENT' && dbUser.paid ? (
                                    <a href="/dashboard/student" className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-all">
                                        Go to Dashboard
                                    </a>
                                ) : dbUser && dbUser.role === 'STUDENT' && !dbUser.paid ? (
                                    <a href="/payment" className="bg-red-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-600 transition-all">
                                        Pay Now
                                    </a>
                                ) : dbUser && dbUser.role === 'PROFESSOR' ? (
                                    <a href="/dashboard/professor" className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-all">
                                        Professor Dashboard
                                    </a>
                                ) : null
                            ) : (
                                <>
                                    <a href="/signup" className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-all">
                                        Get Started
                                    </a>
                                    <a href="/login" className="border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-all">
                                        Log In
                                    </a>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />
        </div>
    );
}

export { HeroGeometric };
