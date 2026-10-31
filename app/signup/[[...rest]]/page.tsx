import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSignUpLazy } from "@/components/auth/AuthWidgetsLazy";
import { CAL_BOOKING_URL } from "@/lib/calBooking";
import { solDemoOnly } from "@/lib/solHosts";

export const metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  if (solDemoOnly()) {
    redirect(CAL_BOOKING_URL);
  }

  return (
    <AuthShell
      title="Create your account"
      description="Sign up to join a section, build coursework, and review graded work with clear reasoning."
      footnote="You must be 13 or older. SOL is invite only at most institutions. Ask your faculty lead to request access for your department."
      paintingSrc="/marketing/auth-inkpot.jpg"
      paintingAlt="Oil painting of an ink pot and fountain pen on parchment"
    >
      <AuthSignUpLazy />
    </AuthShell>
  );
}
