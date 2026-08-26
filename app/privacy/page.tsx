import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Filtard collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-[#8b93a1] mb-10">
        Last updated: August 26, 2026
      </p>

      <section className="mb-10">
        <p className="text-[#9ca3af] leading-relaxed">
          This Privacy Policy explains how Filtard collects, uses, and shares
          information when you use our Service.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          1. Information We Collect
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          When you sign in with Google or X, we receive basic profile
          information such as your name, email address (if provided by the
          provider), and profile picture. We also store content you submit,
          including token submissions, theses, and ratings.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          2. How We Use Information
        </h2>
        <p className="text-[#9ca3af] leading-relaxed mb-3">
          We use this information to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-[#9ca3af] leading-relaxed">
          <li>Authenticate you and manage your account</li>
          <li>Display your public profile on the platform</li>
          <li>Allow you to submit, rate, and interact with tokens</li>
          <li>Operate, maintain, and improve the Service</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          3. Data Sharing
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          We do not sell your personal data. We only share data with service
          providers necessary to operate the platform (for example, Supabase for
          authentication and database). These providers are bound by appropriate
          data protection obligations.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          4. Data Retention
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          We retain your account information for as long as your account is
          active. You may request deletion of your data at any time by contacting
          us.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          5. Cookies
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          We use essential cookies required for authentication and session
          management. We do not use advertising or tracking cookies.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          6. Contact
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          For privacy-related questions or data deletion requests, contact us at{" "}
          <a
            href="mailto:contact@filtard.com"
            className="text-[#f4f6f8] hover:text-[#b8ff3d] transition"
          >
            contact@filtard.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}