import { Navbar } from "@/components/frontend/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { StatsBand } from "@/components/marketing/StatsBand";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Approach } from "@/components/marketing/Approach";
import { Comparison } from "@/components/marketing/Comparison";
import { Faq } from "@/components/marketing/Faq";
import { Footer } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { MARKETING_FAQS } from "@/lib/marketingFaq";
import { getMarketingStats } from "@/lib/marketingStats";
import { absoluteUrl } from "@/lib/siteUrl";

export default async function Home() {
  const stats = await getMarketingStats();
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
              "An academic learning management system for faculty and students — quizzes, feedback, and discussion with auditable AI-assisted grading.",
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "SOL",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            url: homeUrl,
            description:
              "Coursework platform for instructors and learners: quizzes and discussions with reviewable AI-assisted scoring for subjective answers.",
            offers: {
              "@type": "Offer",
              availability: "https://schema.org/InStock",
              price: "0",
              priceCurrency: "USD",
              description:
                "Institutional deployments; student payments are feature-flagged per campus.",
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
      <Navbar />
      <main id="main">
        <Hero />
        <StatsBand stats={stats} />
        <FeatureGrid />
        <Comparison />
        <Approach />
        <Faq />
        <Footer />
      </main>
    </>
  );
}
