import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ACADEMY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${ACADEMY_NAME} — Learn Salesforce. Build Your Future.`,
    template: `%s · ${ACADEMY_NAME}`,
  },
  description:
    "A five-unit, mobile-first course covering Salesforce administration, CRM functionality, Apex programming and Visualforce, with quizzes and an academy course-completion certificate.",
  applicationName: ACADEMY_NAME,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1675D1",
  // Never allow the page to scroll sideways on small screens.
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
