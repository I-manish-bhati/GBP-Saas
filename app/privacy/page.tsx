import Link from "next/link";
import { BackLink } from "@/components/back-link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How GBP Suite collects, uses, shares and protects personal data — including Google Business Profile data, review submissions, AI processing and your privacy rights.",
};

export default function PrivacyPage(): React.ReactNode {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <BackLink />
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Privacy Policy
      </h1>
      <p className="mt-1 text-xs text-zinc-400">Last updated: October 2026</p>

      <div className="mt-6 space-y-8 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <p>
          This Privacy Policy explains how <strong>GBP Suite</strong> (&quot;we&quot;,
          &quot;us&quot;, &quot;our&quot;) collects, uses, shares and protects
          information when you use our Google Business Profile management and QR
          review tools (the &quot;Service&quot;). It applies to business owners
          who create an account, customers who submit reviews through a
          business&apos;s QR link, and visitors to our websites. By using the
          Service you agree to the collection and use of information as
          described here. Capitalised terms that are not defined here have the
          meaning given in our <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
        </p>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            1. Information we collect
          </h2>
          <p className="mt-2">
            We collect information in three ways: what you provide directly,
            what we receive from third parties (mainly Google) when you connect
            them, and what is generated automatically as you use the Service.
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Account information.</strong> Your name, email address and
              a password. Passwords are never stored in plain text — they are
              hashed with Argon2id before they reach our database. If you sign
              up or sign in with Google, we receive your Google account
              identifier, name and email address from Google.
            </li>
            <li>
              <strong>Google Business Profile data.</strong> When you connect a
              location through Google&apos;s OAuth consent screen, we access
              the business profile data needed for the features you use:
              location names and details, reviews and ratings left on your
              listing, review replies, posts, photos, and related metadata. We
              access this only through Google&apos;s official APIs, only with
              your consent, and only for as long as you keep the connection
              active. You can revoke access at any time from your Google
              account settings or by disconnecting the location.
            </li>
            <li>
              <strong>Review submissions (customers).</strong> When a customer
              opens a business&apos;s QR review link, we collect the rating,
              optional tags/chips, any AI draft generated in the flow, the final
              review text, and — if the customer signs in with Google — their
              Google account identifier. We also record basic technical data
              for abuse prevention: IP address, user agent, and timestamps.
            </li>
            <li>
              <strong>Billing information.</strong> Payments are handled by
              Razorpay. We receive and store the order and payment identifiers,
              payment status, plan/slot details and billing history needed to
              unlock your AI features. Full card numbers, UPI credentials and
              bank details are entered on Razorpay&apos;s pages and never touch
              our servers.
            </li>
            <li>
              <strong>Usage and log data.</strong> Pages visited, features used,
              API requests, timestamps, referring URL, device/browser type, and
              error logs. We use this to operate, secure and improve the
              Service — for example to rate-limit abusive traffic and diagnose
              failures.
            </li>
            <li>
              <strong>AI inputs and outputs.</strong> Prompts sent to our AI
              provider (Google Gemini) and the generated responses — including
              the relevant location, review or post context — are stored in our
              logs for auditing, quality control and so you can see what was
              generated.
            </li>
            <li>
              <strong>Communications.</strong> Emails you send us (support,
              data requests) and the transactional emails we send you
              (verification, &quot;post ready&quot;, connection-expired,
              payment alerts). You can control non-essential notification
              emails from Settings → Notification preferences.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            2. How we use your information
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To provide the Service: syncing your Google Business Profile data, showing reviews and posts, rendering QR review landing pages, and publishing only what you approve.</li>
            <li>To generate AI drafts (review replies, posts, review-flow text) using the relevant context.</li>
            <li>To process subscriptions, activate AI slots, detect failed payments and send billing receipts.</li>
            <li>To authenticate you, protect accounts, prevent abuse, and enforce rate limits.</li>
            <li>To send transactional notifications you expect (connection expiring, post awaiting approval, payment failed).</li>
            <li>To answer support requests and data-rights requests.</li>
            <li>To understand aggregated, de-identified usage trends and improve the product.</li>
            <li>To comply with legal obligations and to enforce our Terms.</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> sell your personal data or your
            customers&apos; data, we do not rent it out, and we do not share it
            with third parties for their own advertising.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            3. Legal bases for processing
          </h2>
          <p className="mt-2">
            Where data-protection law requires a legal basis (for example the
            GDPR or UK GDPR for visitors in the EEA/UK), we rely on:{" "}
            <strong>contract performance</strong> (providing the Service you
            requested — account, sync, billing); <strong>legitimate
            interests</strong> (securing the Service, preventing fraud,
            improving core features, direct customer support);{" "}
            <strong>consent</strong> (Google OAuth permissions when you connect
            a location, and any optional processing we ask you to opt into,
            which you can withdraw at any time); and{" "}
            <strong>legal obligation</strong> (retaining accounting or billing
            records where the law requires it).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            4. AI processing
          </h2>
          <p className="mt-2">
            Drafts for review replies, posts and the review-landing flow are
            generated by Google Gemini. To produce a draft, the relevant context
            — location details, the review being replied to, or the
            post brief — is sent to the AI provider together with your prompt.
            Generated content is always a suggestion: it is stored, shown to you
            for editing, and nothing is published to Google without your action
            (or an approval timer you can see and cancel). We log prompts and
            raw responses for auditing and quality purposes. AI output can be
            inaccurate; you are responsible for reviewing it before publishing,
            as described in our Terms.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            5. Cookies &amp; similar technologies
          </h2>
          <p className="mt-2">
            We use a small number of <strong>essential cookies</strong>: the
            session cookie that keeps you signed in and cookies required for
            security and load balancing. These are strictly necessary for the
            Service to work. We do not use advertising or cross-site tracking
            cookies. Interface preferences such as dark mode are stored in your
            browser&apos;s local storage rather than on our servers. You can
            clear or block cookies in your browser settings, but blocking
            essential cookies will prevent sign-in from working.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            6. Sharing &amp; subprocessors
          </h2>
          <p className="mt-2">
            We share data only with service providers that process it on our
            behalf for the purposes described in this policy, and only with what
            each service needs to function:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Google</strong> — Business Profile APIs, OAuth sign-in and
              the Gemini API (AI generation).
            </li>
            <li>
              <strong>Supabase</strong> — database and authentication storage.
            </li>
            <li>
              <strong>Razorpay</strong> — payment processing and checkout.
            </li>
            <li>
              <strong>Resend</strong> — delivery of transactional emails.
            </li>
            <li>
              <strong>Cloudinary</strong> — image hosting for location photos
              and post images.
            </li>
            <li>
              <strong>Our hosting provider</strong> — running the application
              and storing backups.
            </li>
          </ul>
          <p className="mt-2">
            We may also disclose information if required by law, regulation or
            valid legal process, or where necessary to protect the rights,
            safety or property of our users or the public. If we are ever
            involved in a merger, acquisition or asset sale, your information
            may be transferred under the same protections described here — we
            would notify you before it becomes subject to a different privacy
            policy.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            7. Data retention &amp; deletion
          </h2>
          <p className="mt-2">
            We keep personal data for as long as your account is active and as
            long as needed to provide the Service, plus any period required by
            law (for example, billing records). When you delete a location, its
            reviews, posts, images, customer submissions and logs are deleted
            with it. You can export your data and permanently delete your
            account at any time from Settings → Your data; you can also email us
            to request deletion of anything that export does not cover. After a
            deletion request, data is removed from our live systems, and any
            residual backups age out on their normal rotation schedule. We
            respond to data requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            8. Security
          </h2>
          <p className="mt-2">
            We protect personal data with industry-appropriate measures,
            including: encryption in transit (HTTPS/TLS); Argon2id password
            hashing; database row-level security so each account only reaches
            its own data; rate limiting on authentication and sensitive
            endpoints; least-privilege access to production systems; and logging
            of security-relevant events. No method of transmission or storage is
            100% secure — if we learn of a breach affecting your personal data,
            we will notify you and the relevant authorities as required by law.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            9. Your rights &amp; choices
          </h2>
          <p className="mt-2">
            Depending on where you live, you may have the right to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Access</strong> the personal data we hold about you.</li>
            <li><strong>Correct</strong> inaccurate or incomplete data (much of it you can edit directly in Settings/Profile).</li>
            <li><strong>Export</strong> a copy of your data (self-serve export in Settings).</li>
            <li><strong>Delete</strong> your account and associated data.</li>
            <li><strong>Restrict or object to</strong> certain processing, and <strong>withdraw consent</strong> where processing is based on consent (including disconnecting Google access).</li>
            <li><strong>Opt out</strong> of non-essential emails via Notification preferences.</li>
            <li><strong>Lodge a complaint</strong> with your local data-protection supervisory authority.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email{" "}
            <strong>help@apoliums.com</strong> from the address associated with
            your account. We may need to verify your identity before acting on a
            request.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            10. International transfers
          </h2>
          <p className="mt-2">
            Our subprocessors (including Google, Supabase and Razorpay) may
            process data in countries other than your own. Where data-protection
            law restricts such transfers, we rely on appropriate safeguards —
            for example standard contractual clauses or the provider&apos;s own
            contractual commitments — so your data keeps an equivalent level of
            protection.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            11. Children&apos;s privacy
          </h2>
          <p className="mt-2">
            The Service is a business tool and is not directed at children. We
            do not knowingly collect personal data from children. If you
            believe a child has provided us with personal data, contact us and
            we will delete it.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            12. Third-party services
          </h2>
          <p className="mt-2">
            The Service integrates with third parties such as Google and
            Razorpay, and review pages link out to Google. Your use of those
            services is governed by their own privacy policies and terms — we
            encourage you to read them. We are not responsible for the practices
            of third-party services.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            13. Changes to this policy
          </h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. When we make
            material changes, we will notify you by email or through the
            Service, and we will revise the &quot;Last updated&quot; date at the
            top of this page. Continued use of the Service after an update means
            you accept the revised policy.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            14. Contact
          </h2>
          <p className="mt-2">
            Questions, concerns or data requests about this Privacy Policy or
            how we handle your information: <strong>help@apoliums.com</strong>.
            We reply within a reasonable time and no later than 30 days.
          </p>
        </section>
      </div>
    </main>
  );
}
