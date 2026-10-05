import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage(): React.ReactNode {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link
        href="/login"
        className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Privacy Policy
      </h1>
      <p className="mt-1 text-xs text-zinc-400">Last updated: October 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            1. What we collect
          </h2>
          <p className="mt-1">
            <strong>Account owners:</strong> your email address, password hash,
            and the Google Business Profile data you connect (location names,
            reviews, posts, photos) — accessed only through Google&apos;s APIs
            and with your consent. <strong>Customers:</strong> when you submit a
            review through a business&apos;s QR link, we store your Google
            account identifier (if you sign in), your rating, optional tags, an
            AI draft if you generated one, and the final text you submitted.
            <strong> Payments:</strong> processed by Razorpay — we never see or
            store your full card details.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            2. How we use it
          </h2>
          <p className="mt-1">
            To provide the service: syncing your Google Business Profile data,
            generating AI drafts, tracking review-landing-page performance,
            billing, security (rate limiting, abuse prevention), and
            transactional notifications (e.g. “your post is ready”,
            “connection expired”). We do not sell your data or your
            customers&apos; data.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            3. AI processing
          </h2>
          <p className="mt-1">
            Drafts (review replies, posts, review landing text) are generated
            with Google Gemini using the relevant location/review context. We
            log prompts and raw responses for auditing and quality purposes.
            Generated content is editable and nothing is published without your
            action (or an approval timer you can see and cancel).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            4. Sharing & subprocessors
          </h2>
          <p className="mt-1">
            Data is processed by: Google (Business Profile APIs, OAuth, Gemini),
            Supabase (database &amp; auth storage), Razorpay (payments),
            Resend (transactional email), Cloudinary (image hosting), and our
            hosting provider. We share only what each service needs to function.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            5. Retention & deletion
          </h2>
          <p className="mt-1">
            We keep data while your account is active. Deleting a location
            cascades its reviews, posts, images, submissions, and logs. You can
            request full account deletion at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            6. Contact
          </h2>
          <p className="mt-1">
            Questions or data requests: <strong>privacy@example.com</strong>.
            We respond within a reasonable time and no later than 30 days.
          </p>
        </section>
      </div>
    </main>
  );
}
