'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import Logo from '@/components/Logo';

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Last updated: January 12, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">1. Introduction</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              TRINETRA (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our crowd monitoring and safety management platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium text-zinc-800 dark:text-zinc-200 mb-3">2.1 Video and Image Data</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Our platform processes video feeds from cameras to detect and count people for crowd management purposes. We use AI-powered detection that focuses on crowd density and movement patterns, not individual identification.
            </p>
            <h3 className="text-xl font-medium text-zinc-800 dark:text-zinc-200 mb-3">2.2 Account Information</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              When you create an account, we collect your email address, name, and authentication credentials through our secure authentication provider (Clerk).
            </p>
            <h3 className="text-xl font-medium text-zinc-800 dark:text-zinc-200 mb-3">2.3 Usage Data</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              We collect information about how you interact with our platform, including access times, features used, and system preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-zinc-600 dark:text-zinc-400 space-y-2">
              <li>To provide real-time crowd monitoring and safety alerts</li>
              <li>To generate analytics and reports for crowd management</li>
              <li>To improve our AI detection algorithms and platform performance</li>
              <li>To communicate important updates and security notifications</li>
              <li>To comply with legal obligations and protect public safety</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">4. Data Security</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              We implement industry-standard security measures including encryption, secure authentication, and regular security audits. Video data is processed in real-time and is not stored permanently unless explicitly configured by the user.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">5. Data Retention</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Analytics data and incident reports are retained for 90 days by default. Users can configure custom retention periods or request immediate deletion of their data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">6. Your Rights</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              You have the right to access, correct, or delete your personal data. You may also request a copy of your data or object to certain processing activities. Contact us at privacy@TRINETRA.com to exercise these rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">7. Contact Us</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              If you have questions about this Privacy Policy, please contact us at:
              <br />
              <strong>Email:</strong> privacy@TRINETRA.com
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
