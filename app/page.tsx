import { Navbar } from "@/components/frontend/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { StatsBand } from "@/components/marketing/StatsBand";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Approach } from "@/components/marketing/Approach";
import { Footer } from "@/components/marketing/Footer";
import { getMarketingStats } from "@/lib/marketingStats";

export default async function Home() {
  const stats = await getMarketingStats();

  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <StatsBand stats={stats} />
        <FeatureGrid />
        <Approach />
      </main>
      <Footer />
    </>
  );
}
