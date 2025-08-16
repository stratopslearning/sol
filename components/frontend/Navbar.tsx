"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUser } from "@/lib/getOrCreateUser";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);
  const { isSignedIn, user } = useUser();

  // Fetch user data from database
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user')
        .then(res => res.json())
        .then(data => setDbUser(data.user))
        .catch(err => console.error('Error fetching user:', err));
    }
  }, [isSignedIn]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg"
            : "bg-transparent"
        )}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
              <span className="text-white font-semibold text-lg md:text-xl">
                S-O-L
              </span>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {/* Auth Buttons */}
              <div className="flex items-center space-x-4">
                {isSignedIn ? (
                  <div className="flex items-center space-x-3">
                    {dbUser && dbUser.role === 'STUDENT' && dbUser.paid && (
                      <Button asChild variant="secondary">
                        <a href="/dashboard/student">Dashboard</a>
                      </Button>
                    )}
                    {dbUser && dbUser.role === 'STUDENT' && !dbUser.paid && (
                      <Button asChild variant="destructive">
                        <a href="/payment">Pay Now</a>
                      </Button>
                    )}
                    {dbUser && dbUser.role === 'PROFESSOR' && (
                      <Button asChild variant="secondary">
                        <a href="/dashboard/professor">Professor Dashboard</a>
                      </Button>
                    )}
                    {dbUser && dbUser.role === 'ADMIN' && (
                      <Button asChild variant="secondary">
                        <a href="/dashboard/admin">Admin Dashboard</a>
                      </Button>
                    )}
                    {dbUser && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-white/60">{dbUser.role}</span>
                        {dbUser.role === 'STUDENT' && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            dbUser.paid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {dbUser.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                    )}
                    <UserButton 
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8",
                          userButtonPopoverCard: "bg-white/10 backdrop-blur-md border border-white/20",
                          userButtonPopoverActionButton: "text-white hover:bg-white/10",
                          userButtonPopoverActionButtonText: "text-white",
                          userButtonPopoverFooter: "border-white/20"
                        }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <a href="/login" className="text-white/80 hover:text-white transition-colors">
                      Sign In
                    </a>
                    <a href="/signup" className="bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-all font-medium">
                      Get Started
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white p-2"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 md:top-20 left-0 right-0 z-40 bg-white/10 backdrop-blur-md border-b border-white/20 md:hidden"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-col space-y-4">
                <MobileNavLink href="#features">Features</MobileNavLink>
                <MobileNavLink href="#pricing">Pricing</MobileNavLink>
                <MobileNavLink href="#about">About</MobileNavLink>
                {isSignedIn && dbUser && dbUser.role === 'STUDENT' && dbUser.paid && (
                  <MobileNavLink href="/dashboard/student">Dashboard</MobileNavLink>
                )}
                {isSignedIn && dbUser && dbUser.role === 'PROFESSOR' && (
                  <MobileNavLink href="/dashboard/professor">Professor Dashboard</MobileNavLink>
                )}
                {isSignedIn && dbUser && dbUser.role === 'ADMIN' && (
                  <MobileNavLink href="/dashboard/admin">Admin Dashboard</MobileNavLink>
                )}
                
                {/* Mobile Auth Buttons */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-white/20">
                  {isSignedIn ? (
                    <div className="flex items-center justify-between">
                      <span className="text-white/80">Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                      <UserButton 
                        appearance={{
                          elements: {
                            avatarBox: "w-8 h-8",
                            userButtonPopoverCard: "bg-white/10 backdrop-blur-md border border-white/20",
                            userButtonPopoverActionButton: "text-white hover:bg-white/10",
                            userButtonPopoverActionButtonText: "text-white",
                            userButtonPopoverFooter: "border-white/20"
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <a href="/login" className="w-full text-left text-white/80 hover:text-white transition-colors py-2">
                        Sign In
                      </a>
                      <a href="/signup" className="w-full bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-all font-medium">
                        Get Started
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-white/80 hover:text-white transition-colors font-medium"
    >
      {children}
    </a>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-white/80 hover:text-white transition-colors font-medium py-2"
    >
      {children}
    </a>
  );
} 