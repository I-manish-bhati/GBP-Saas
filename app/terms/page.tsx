import Link from "next/link";

export const metadata = { title: "Terms of Service" };

export default function TermsPage(): React.ReactNode {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link
        href="/login"
        className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Terms of Service
      </h1>
      <p className="mt-1 text-xs text-zinc-400">Last updated: October 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            1. The service
          </h2>
          <p className="mt-1">
            We provide Google Business Profile management tools (review
            replies, posts, QR review landing pages) for businesses. You need a
            valid Google account with Business Profile access to connect
            locations. Usage is subject to Google&apos;s own APIs terms.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            2. Your account
          </h2>
          <p className="mt-1">
            You are responsible for your login credentials and for all activity
            under your account. Don&apos;t share your password. Tell us
            immediately if you suspect unauthorized access. We may suspend
            accounts used for abuse or fraud.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            3. AI-generated content
          </h2>
          <p className="mt-1">
            AI drafts are suggestions. You review and approve everything before
            it publishes, and you own the final content you publish. AI output
            can be inaccurate — you are responsible for checking it before
            posting to Google.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            4. Review integrity
          </h2>
          <p className="mt-1">
            Our QR flow helps customers write honest reviews on Google. It does
            not gate who can review, offer incentives, or filter reviews by
            rating — and you agree not to use the service to manipulate or
            buy reviews, which violates Google&apos;s policies and will get your
            Business Profile penalized.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            5. Billing
          </h2>
          <p className="mt-1">
            AI slots are billed at ₹299 per location per month via Razorpay at
            checkout. Connecting Google locations is free. AI features unlock
            for as many locations as you&apos;ve paid for while your
            subscription is active.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            6. Availability
          </h2>
          <p className="mt-1">
            We aim for high availability but the service is provided
            &quot;as is&quot; without warranty. To the extent permitted by law,
            our liability is limited to the amount you paid us in the last 12
            months.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            7. Changes & contact
          </h2>
          <p className="mt-1">
            We&apos;ll notify you of material changes to these terms. Questions:{" "}
            <strong>legal@example.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
