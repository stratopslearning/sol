import { Navbar } from "@/components/frontend/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Approach } from "@/components/marketing/Approach";
import { Footer } from "@/components/marketing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <FeatureGrid />
        <Approach />
      </main>
      <Footer />
    </>
  );
}
