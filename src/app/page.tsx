import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/home/hero";
import { CurriculumSection, FALLBACK_UNITS } from "@/components/home/curriculum-section";
import { BenefitsSection } from "@/components/home/benefits-section";
import { ProcessSection } from "@/components/home/process-section";
import { FaqSection } from "@/components/home/faq-section";
import { CtaSection } from "@/components/home/cta-section";
import { api } from "@/lib/api-client";
import { COURSE_SLUG } from "@/lib/constants";
import type { CourseOverview } from "@/types";

export const metadata: Metadata = {
  title: "Learn Salesforce. Build Your Future.",
  description:
    "A five-unit, mobile-first course covering Salesforce administration, CRM functionality, Apex programming and Visualforce, with unit quizzes, progress tracking and an academy course-completion certificate.",
};

// Always read the curriculum fresh — the API may be restarted while the site runs.
export const revalidate = 0;

export default async function HomePage() {
  // If the backend is unreachable the page still renders with the static
  // five-unit fallback instead of crashing.
  let units = FALLBACK_UNITS;
  try {
    const course = await api.get<CourseOverview>(`/courses/${COURSE_SLUG}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (course?.units?.length) units = course.units;
  } catch {
    units = FALLBACK_UNITS;
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <CurriculumSection units={units} />
        <BenefitsSection />
        <ProcessSection />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
