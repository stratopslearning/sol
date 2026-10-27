import { Navbar } from "@/components/frontend/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { HumanSafety } from "@/components/marketing/HumanSafety";
import { LoopSteps } from "@/components/marketing/LoopSteps";
import { MarketingFaq } from "@/components/marketing/MarketingFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { MARKETING_FAQS } from "@/lib/marketingFaq";
import { absoluteUrl } from "@/lib/siteUrl";

export default async function Home() {
  const homeUrl = absoluteUrl("/");

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "SOL",
            url: homeUrl,
            description:
              "The AI teaching layer for the LMS you already use. The operating system for teaching.",
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "SOL",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            url: homeUrl,
            description:
              "Turns instructor materials into courses, practice, and quizzes; tutors from the course only; assesses in ways that are hard to game; grades with auditable rubrics; shows concept-level gaps. Built for Canvas.",
            offers: {
              "@type": "Offer",
              availability: "https://schema.org/InStock",
              price: "0",
              priceCurrency: "USD",
              description:
                "Free pilot for one course. Department plans on request.",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: MARKETING_FAQS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
              },
            })),
          },
        ]}
      />
      <div className="mkt min-h-screen">
        <Navbar />
        <main id="main">
          <Hero />
          <LoopSteps />
          <MarketingFaq />
          <HumanSafety />
          <Footer />
        </main>
      </div>
    </>
  );
}
