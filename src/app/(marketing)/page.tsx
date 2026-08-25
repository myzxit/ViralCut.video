import { FaqSection } from '@/components/landing/FaqAccordion';
import { FinalCta } from '@/components/landing/FinalCta';
import { GenreTabs } from '@/components/landing/GenreTabs';
import { Hero } from '@/components/landing/Hero';
import { ReconstructSection } from '@/components/landing/ReconstructSection';
import {
  ExtrasSection,
  FeaturesSection,
  PersonaSection,
  TestimonialSection,
  WorkflowSection,
} from '@/components/landing/Sections';
import { UseCaseMarquee } from '@/components/landing/UseCaseMarquee';

export default function HomePage() {
  return (
    <>
      <Hero />
      <UseCaseMarquee />
      <GenreTabs />
      <ReconstructSection />
      <WorkflowSection />
      <FeaturesSection />
      <PersonaSection />
      <TestimonialSection />
      <ExtrasSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
