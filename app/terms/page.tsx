import Link from "next/link";
import { BackLink } from "@/components/back-link";

export const metadata = {
  title: "Terms of Service",
  description:
    "The rules for using GBP Suite — accounts, Google integrations, AI content, review integrity, billing, and everything else that governs your use of the Service.",
};

export default function TermsPage(): React.ReactNode {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <BackLink />
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Terms of Service
      </h1>
      <p className="mt-1 text-xs text-zinc-400">Last updated: October 2026</p>

      <div className="mt-6 space-y-8 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <p>
          These Terms of Service (&quot;Terms&quot;) are a legal agreement
          between you and <strong>GBP Suite</strong> (&quot;we&quot;,
          &quot;us&quot;, &quot;our&quot;) for your use of our Google Business
          Profile management and QR review tools (the &quot;Service&quot;).
          Please read them carefully. By creating an account or using the
          Service you agree to be bound by these Terms and by our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the Service.
        </p>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            1. The service
          </h2>
          <p className="mt-2">
            GBP Suite provides tools for businesses to manage their Google
            Business Profile presence, including: syncing locations, reviews and
            posts; AI-assisted draft replies and posts; QR codes and review
            landing pages that help customers write reviews on Google; and
            subscription-based AI features. The Service evolves over time — we
            may add, change or remove features, and we will not charge you for
            a materially reduced paid feature without giving you the chance to
            cancel first.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            2. Eligibility &amp; your account
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You must be at least 18 years old and able to enter into a binding contract to use the Service.</li>
            <li>The Service is for business use. You need a valid Google account with access to the Business Profile(s) you connect.</li>
            <li>Provide accurate registration information and keep it up to date.</li>
            <li>You are responsible for your login credentials and for all activity under your account. Keep your password confidential and notify us immediately at <strong>help@apoliums.com</strong> if you suspect unauthorised access.</li>
            <li>One person or legal entity may not maintain accounts for the purpose of circumventing limits, fees or restrictions.</li>
          </ul>
          <p className="mt-2">
            We may suspend or delete accounts used for abuse, fraud, or
            activity that violates these Terms or Google&apos;s policies.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            3. Google &amp; other third-party integrations
          </h2>
          <p className="mt-2">
            The Service works by connecting to third-party platforms —
            primarily Google (Business Profile APIs, OAuth, the Gemini API for
            AI generation) and Razorpay (payments). Your use of those platforms
            is governed by their own terms: Google&apos;s APIs Terms of
            Service, Google&apos;s Business Profile guidelines and AI
            usage policies, and Razorpay&apos;s terms, as applicable. You must
            follow them.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You grant us the OAuth permissions needed to read and, where a feature requires it, publish to the locations you connect — only for as long as the connection stays active.</li>
            <li>You can revoke our Google access at any time from your Google account settings or by disconnecting a location.</li>
            <li>Third-party platforms may change, suspend or discontinue their APIs. We are not liable if the Service is affected by such changes or outages on their side.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            4. Acceptable use
          </h2>
          <p className="mt-2">You agree not to use the Service to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>violate any applicable law, regulation, or the rights of others;</li>
            <li>manipulate, buy, sell, incentivise or filter reviews, or otherwise violate Google&apos;s review policies (see section 5);</li>
            <li>upload or distribute malware, or attempt to probe, scan or breach our security or rate limits;</li>
            <li>scrape, harvest or copy data from the Service except through documented APIs and with our written permission;</li>
            <li>reverse engineer or attempt to derive the source code of the Service except where the law expressly permits it;</li>
            <li>resell, sublicense or white-label the Service without a separate written agreement;</li>
            <li>impersonate another person or misrepresent your affiliation with a business;</li>
            <li>use the Service to generate or publish content that is unlawful, defamatory, harassing, or that infringes intellectual-property rights; or</li>
            <li>circumvent AI usage limits, subscription gates or other controls by sharing accounts or by any automated means.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            5. Review integrity
          </h2>
          <p className="mt-2">
            Our QR flow helps customers write honest reviews on Google. It does
            not gate who can review, offer incentives, or filter reviews by
            rating — and you agree not to use the Service to manipulate or buy
            reviews. Review manipulation violates Google&apos;s policies and can
            get your Business Profile penalised or removed. You are responsible
            for the authenticity of the reviews you encourage from your
            customers and for complying with Google&apos;s review guidelines
            (including its rules on incentivised and conflicted reviews).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            6. AI-generated content
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>AI drafts (review replies, posts, review-flow text) are <strong>suggestions only</strong>. Nothing is published to Google without your approval, or without a visible approval timer you can cancel.</li>
            <li>AI output can be inaccurate, incomplete or outdated. You must review and edit it before publishing; you are solely responsible for what you publish.</li>
            <li>AI features are metered. Usage is limited to the AI slots you have purchased and while your subscription is active (see section 9).</li>
            <li>By publishing AI-assisted content you confirm it complies with these Terms, Google&apos;s policies, and the law.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            7. Your content
          </h2>
          <p className="mt-2">
            You keep ownership of the content you create or upload in the
            Service — your posts, images, replies, drafts and brand assets. You
            grant us a limited, non-exclusive, worldwide licence to host, store,
            process, display and transmit that content solely to operate the
            Service on your behalf (for example, to generate drafts, render QR
            pages, and publish to Google where you ask us to). You represent
            that you have the rights to the content you upload and that it does
            not infringe the rights of others.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            8. Customer review submissions
          </h2>
          <p className="mt-2">
            When a customer submits a review through a business&apos;s QR
            landing page, we process the rating, tags, draft and final text to
            prepare the handoff to Google. Submissions are handled under our
            Privacy Policy. The customer confirms that their review reflects a
            genuine experience; businesses must not attempt to alter, suppress
            or selectively request reviews through the Service in a way that
            violates Google&apos;s policies.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            9. Fees, billing &amp; refunds
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Connecting Google locations and using the core review/QR tools is free. AI features are paid: <strong>AI slots are ₹299 per location per month</strong>, billed through Razorpay at checkout.</li>
            <li>AI features unlock for as many locations as you have paid slots for, while your subscription is active.</li>
            <li>Subscriptions renew automatically each billing period until you cancel. You can cancel any time; the slot remains active until the end of the period you already paid for, then renews no further.</li>
            <li>Prices are shown at checkout, with any applicable taxes displayed before you pay.</li>
            <li>If a payment fails, we may notify you and pause paid AI features until the balance is settled; the rest of your account stays available.</li>
            <li><strong>Fees are non-refundable</strong> except where required by law or where a charge failed or was duplicated — in which case contact us and we will make it right.</li>
            <li>If we change pricing, we will give at least 30 days&apos; notice; the new price applies from your next renewal, and you may cancel before it takes effect.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            10. Intellectual property
          </h2>
          <p className="mt-2">
            The Service itself — software, design, logos, branding and
            documentation — is owned by us and protected by intellectual-property
            laws. These Terms do not transfer any of our intellectual property
            to you. If you send us feedback or suggestions, we may use them
            without obligation or compensation to you. &quot;GBP Suite&quot; and
            related marks may not be used without our prior written permission
            except to truthfully state that you use the Service.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            11. Third-party links
          </h2>
          <p className="mt-2">
            The Service links to third-party websites and services (including
            Google review pages and payment pages). They are provided for
            convenience and are governed by their own terms and privacy
            policies. We do not control and are not responsible for their
            content or practices.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            12. Disclaimers
          </h2>
          <p className="mt-2">
            The Service is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, whether express or
            implied — including warranties of merchantability, fitness for a
            particular purpose, and non-infringement. We do not warrant that
            the Service will be uninterrupted, error-free or fully secure, that
            it will meet every business requirement, or that AI output will be
            accurate or unbiased. Google ratings, reviews and platform features
            are controlled by Google and may change without notice.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            13. Limitation of liability
          </h2>
          <p className="mt-2">
            To the maximum extent permitted by law, neither party will be liable
            for indirect, incidental, special, consequential or punitive
            damages, or for lost profits, lost data or business interruption,
            even if advised of the possibility. Our total aggregate liability
            arising out of or related to the Service will not exceed the amount
            you paid us in the 12 months before the event giving rise to the
            claim (or ₹1,000 if you have paid nothing). Nothing in these Terms
            limits liability that cannot be limited by law, including liability
            for fraud or wilful misconduct.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            14. Indemnification
          </h2>
          <p className="mt-2">
            You agree to indemnify and hold us harmless from claims, damages and
            expenses (including reasonable legal fees) arising out of: your
            content; your use of the Service; your violation of these Terms or
            a third party&apos;s rights (including Google&apos;s policies); or
            your violation of any law or regulation.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            15. Suspension &amp; termination
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You may stop using the Service at any time and delete your account from Settings.</li>
            <li>We may suspend or terminate your access if you materially breach these Terms, if required by law, or to protect the Service and its users. Where reasonable, we will give you notice and a chance to fix the problem.</li>
            <li>On termination, your right to use the Service ends. Sections that by their nature should survive (including intellectual property, disclaimers, liability limits, indemnity and dispute terms) will survive.</li>
            <li>Account and location data is handled according to our Privacy Policy, including your right to export and request deletion.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            16. Changes to these terms
          </h2>
          <p className="mt-2">
            We may update these Terms from time to time. For material changes we
            will notify you by email or through the Service at least 30 days
            before they take effect, and we will update the &quot;Last
            updated&quot; date. Continuing to use the Service after the effective
            date means you accept the updated Terms. If you do not agree,
            stop using the Service and delete your account before the changes
            apply.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            17. Governing law &amp; disputes
          </h2>
          <p className="mt-2">
            These Terms are governed by the laws of India, without regard to
            conflict-of-law rules. Before filing a claim, you agree to try to
            resolve the dispute informally by contacting{" "}
            <strong>help@apoliums.com</strong> — most issues are solved that
            way within 30 days. If we cannot resolve it, the courts of competent
            jurisdiction in India will have exclusive venue, and each party
            consents to their jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            18. General
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Severability:</strong> if any provision is found unenforceable, the rest stays in effect.</li>
            <li><strong>No waiver:</strong> our failure to enforce a provision is not a waiver of it.</li>
            <li><strong>Entire agreement:</strong> these Terms plus the Privacy Policy are the whole agreement between you and us about the Service and replace any prior discussions.</li>
            <li><strong>Assignment:</strong> you may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition or sale of assets.</li>
            <li><strong>Force majeure:</strong> neither party is liable for delays caused by events beyond reasonable control (including outages of Google, Razorpay or the internet).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            19. Contact
          </h2>
          <p className="mt-2">
            Questions about these Terms: <strong>help@apoliums.com</strong>.
            For how we handle your personal data, see our{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
