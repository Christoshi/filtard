import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of Filtard.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-[#8b93a1] mb-10">
        Last updated: August 26, 2026
      </p>

      <section className="mb-10">
        <p className="text-[#9ca3af] leading-relaxed">
          By accessing or using Filtard (“the Service”), you agree to these
          Terms of Service. If you do not agree, do not use the Service. You
          must be at least 18 years old to use the Service.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          1. Description of Service
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          Filtard is a community-curated memecoin screener that allows users to
          browse, submit, rate, and discuss tokens. The Service is for
          informational and community purposes only. It is not a broker,
          exchange, or investment advisor.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          2. User Accounts
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          You may sign in using third-party providers (Google or X). You are
          responsible for your account and activity under it.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          3. User Content
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          You retain ownership of content you submit (theses, ratings, profile
          information). By submitting, you grant Filtard a non-exclusive,
          worldwide, royalty-free license to display and use that content to
          operate the Service. We may remove content that violates these Terms.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          4. Prohibited Conduct
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          You agree not to use the Service for illegal purposes, to submit false
          or misleading information, to spam, harass others, or to disrupt or
          abuse the platform.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          5. No financial advice; risk
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          Filtard is provided “as is” without warranties of any kind. We do not
          provide financial, investment, or trading advice. Token data, theses,
          ratings, and rankings are informational only and may be wrong or
          outdated. Cryptocurrency is highly volatile and you can lose money.
          You are solely responsible for your decisions.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          6. Limitation of liability
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          To the fullest extent allowed by law, Filtard and its operators are
          not liable for any loss or damage arising from your use of the
          Service or reliance on any content on it.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          7. Changes
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          We may update these Terms from time to time. Continued use after
          changes are posted means you accept the updated Terms.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-lg font-semibold text-[#f4f6f8] mb-3 tracking-tight">
          8. Contact
        </h2>
        <p className="text-[#9ca3af] leading-relaxed">
          Questions:{" "}
          <a
            href="mailto:contact@filtard.com"
            className="text-[#f4f6f8] hover:text-[#b8ff3d] transition"
          >
            contact@filtard.com
          </a>
        </p>
      </section>
    </div>
  );
}