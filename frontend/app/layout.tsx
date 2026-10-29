import "./globals.css";
import { LearnovaProvider } from "@/components/LearnovaProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: { default: "Learnova — Learn Without Limits", template: "%s | Learnova" },
  description: "Expert-led courses, practical projects, and a complete university learning experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><LearnovaProvider><a href="#main-content" className="skip-link">Skip to content</a><Header /><main id="main-content" className="min-h-[65vh]">{children}</main><Footer /></LearnovaProvider></body>
    </html>
  );
}
