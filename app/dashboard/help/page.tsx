import Link from "next/link";

export const dynamic = "force-dynamic";

interface Faq {
  q: string;
  a: React.ReactNode;
}

const FAQS: Faq[] = [
  {
    q: "How do I get started?",
    a: (
      <>
        Connect your Google Business Profile from the dashboard (it&apos;s
        free), pick the locations you manage, then open the{" "}
        <strong>QR code</strong> tab to download your review poster. Print it
        or place it near the checkout — customers scan, sign in with Google,
        and leave a review in under a minute.
      </>
    ),
  },
  {
    q: "How does the QR review flow work?",
    a: (
      <>
        The QR opens your public review page (<code>/r/your-slug</code>).
        Customers pick a star rating, tap a few tags, and can generate an
        AI-drafted review they can edit before submitting. Positive ratings
        hand off to Google&apos;s official review page — we never post reviews
        ourselves and never gate or incentivise reviews.
      </>
    ),
  },
  {
    q: "What counts as an AI generation?",
    a: (
      <>
        AI replies, post captions and QR review drafts each count once against
        your daily cap (100 per owner, rolling 24 hours). Current usage is
        shown in <Link href="/dashboard/settings">Settings</Link>.
      </>
    ),
  },
  {
    q: "What do I pay for?",
    a: (
      <>
        Connecting Google locations and collecting QR reviews is free. AI
        features (auto-replies, post generation, AI review drafts) need a paid
        slot at ₹299/location/month — see{" "}
        <Link href="/dashboard/billing">Billing</Link>.
      </>
    ),
  },
  {
    q: "My Google connection needs reconnecting — what do I do?",
    a: (
      <>
        Google tokens expire occasionally. Click <strong>Reconnect</strong> on
        the location (Dashboard, Settings, or the banner) and approve access
        again. Other locations keep working while one is disconnected.
      </>
    ),
  },
  {
    q: "A post failed to publish. Is something broken?",
    a: (
      <>
        Failed posts show under the location&apos;s <strong>Posts</strong> tab
        with the reason, and you&apos;ll get a notification. Fix the issue
        (usually reconnection) and retry, or reject the draft.
      </>
    ),
  },
];

export default function HelpPage(): React.ReactNode {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Help
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Quick answers to the most common questions.
      </p>

      <div className="mt-6 space-y-4">
        {FAQS.map((f) => (
          <section
            key={f.q}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {f.q}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {f.a}
            </p>
          </section>
        ))}

        <section className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Still stuck?
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Email{" "}
            <a
              href="mailto:support@gbpsuite.example"
              className="underline underline-offset-2"
            >
              support@gbpsuite.example
            </a>{" "}
            with your location name and we&apos;ll get back to you. For
            account-level actions (suspend, billing disputes) contact your
            administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
