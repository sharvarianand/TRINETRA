'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import Logo from '@/components/Logo';

export default function TermsPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors duration-200`}>
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <Link 
            href="/" 
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">Terms of Service</h1>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Last updated: January 12, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">1. Acceptance of Terms</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              By accessing or using TRINETRA&apos;s crowd monitoring platform (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">2. Description of Service</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              TRINETRA provides AI-powered crowd monitoring, people counting, density analysis, and safety management tools. Our Service includes real-time video processing, analytics dashboards, heat maps, and alert systems designed for public safety and crowd management.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2">
              <li>You must provide accurate account information and maintain its security</li>
              <li>You are responsible for ensuring cameras are deployed in compliance with local laws and regulations</li>
              <li>You must obtain necessary permissions for video surveillance in your jurisdiction</li>
              <li>You agree not to use the Service for illegal surveillance or privacy violations</li>
              <li>You must not attempt to reverse engineer, hack, or compromise the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">4. Permitted Use</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              The Service is intended for legitimate crowd safety and management purposes including:
            </p>
            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2">
              <li>Public event management and safety monitoring</li>
              <li>Facility occupancy management</li>
              <li>Emergency response and evacuation planning</li>
              <li>Traffic flow optimization in public spaces</li>
              <li>Retail and venue analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">5. Intellectual Property</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              All content, features, and functionality of the Service, including but not limited to software, algorithms, designs, and documentation, are owned by TRINETRA and protected by intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">6. Limitation of Liability</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              TRINETRA provides the Service &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service. The Service is a tool to assist with crowd management and should not be the sole basis for safety decisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">7. Service Availability</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              We strive to maintain high availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue aspects of the Service with reasonable notice. Critical safety systems should have backup procedures in place.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">8. Termination</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              We may terminate or suspend your access to the Service immediately for violations of these Terms. Upon termination, your right to use the Service ceases, and we may delete your account data according to our data retention policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">9. Changes to Terms</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">10. Contact</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              For questions about these Terms, contact us at:
              <br />
              <strong>Email:</strong> legal@TRINETRA.com
              <br />
              <strong>Address:</strong> TRINETRA Technologies, Bangalore, India
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 dark:text-zinc-400 text-sm">
          © 2026 TRINETRA. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
