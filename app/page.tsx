import Link from "next/link";

function Logo({ size = "md" }: { size?: "md" | "sm" }) {
  const box = size === "md" ? "h-9 w-9 text-base" : "h-8 w-8 text-sm";
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center rounded-xl brand-gradient font-bold text-white shadow-lg shadow-indigo-500/25 [font-family:var(--font-display)] ${box}`}
      >
        G
      </span>
      <span className="font-display text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        GBP Suite
      </span>
    </span>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-fuchsia-50 text-indigo-600 ring-1 ring-indigo-100/70 dark:from-indigo-500/10 dark:to-fuchsia-500/10 dark:text-indigo-300 dark:ring-indigo-400/20">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  );
}

const FEATURES = [
  {
    title: "AI review replies",
    body: "On-brand draft replies for every Google review — approve, tweak, or send in one click.",
    icon: (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
  },
  {
    title: "QR review flow",
    body: "Print-ready QR codes turn table tents and packaging into guided feedback and happy Google reviews.",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM19 19h2v2h-2z" />
      </>
    ),
  },
  {
    title: "AI Google Posts",
    body: "Drafts written for your business, scheduled and auto-published — you just approve.",
    icon: (
      <>
        <path d="M5 4h14a1 1 0 0 1 1 1v14l-4-3H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        <path d="M9 9h6M9 12h4" />
      </>
    ),
  },
  {
    title: "Multi-location dashboard",
    body: "Every location, one login: reviews, posts, QR and connections side by side.",
    icon: (
      <>
        <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  },
  {
    title: "Smart notifications",
    body: "A bell for what needs you now, optional email copies for later — you control both.",
    icon: (
      <>
        <path d="M6 8a6 6 0 1 1 12 0c0 6 3 6 3 6H3s3 0 3-6z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  },
  {
    title: "Simple slot billing",
    body: "Pay per location slot, upgrade or cancel anytime — receipts and history in-app.",
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </>
    ),
  },
];

const STEPS = [
  {
    title: "Connect Google",
    body: "Link your Business Profile securely — locations import in seconds.",
  },
  {
    title: "Set up your QR",
    body: "Download table tents or share a short link. Customers scan, you get feedback.",
  },
  {
    title: "Grow on autopilot",
    body: "AI drafts replies and posts, you approve, reviews and rankings follow.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* ambient orbs */}
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[110px]"
      />
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute top-64 -right-40 h-[340px] w-[340px] rounded-full bg-fuchsia-500/15 blur-[100px] [animation-delay:-3s]"
      />
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute top-[520px] -left-40 h-[300px] w-[300px] rounded-full bg-violet-500/15 blur-[100px] [animation-delay:-5s]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="GBP Suite home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:flex">
          <a href="#features" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
            Features
          </a>
          <a href="#how" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
          >
            Start free
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-16 text-center sm:pt-24">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
            <span className="text-fuchsia-500">✦</span> AI-powered Google
            Business Profile management
          </p>

          <h1
            className="animate-fade-up mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50"
            style={{ animationDelay: "0.08s" }}
          >
            Turn Google searches into{" "}
            <span className="gradient-text">glowing reviews.</span>
          </h1>

          <p
            className="animate-fade-up mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400"
            style={{ animationDelay: "0.16s" }}
          >
            GBP Suite helps local businesses manage their Google Business
            Profile — AI-drafted replies and posts, QR codes that turn
            customers into reviewers, and one dashboard for every location.
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row"
            style={{ animationDelay: "0.24s" }}
          >
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-violet-500"
            >
              Start free
            </Link>
            <a
              href="#how"
              className="rounded-full border border-zinc-300 px-7 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              See how it works
            </a>
          </div>

          <p
            className="animate-fade-up mt-4 text-xs text-zinc-500 dark:text-zinc-500"
            style={{ animationDelay: "0.3s" }}
          >
            Create your account in under a minute · Cancel anytime
          </p>

          {/* product mockup */}
          <div
            className="animate-fade-up mt-14 w-full max-w-xl"
            style={{ animationDelay: "0.38s" }}
          >
            <div className="animate-float relative mx-auto w-[88%] rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-2xl shadow-indigo-500/15 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md brand-gradient text-[10px] font-bold text-white">
                    G
                  </span>
                  Reviews
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                  +18% this week
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[5, 5, 4].map((stars, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        {["Priya S.", "Arjun M.", "Kavita R."][i]}
                      </span>
                      <span className="text-amber-500" aria-label={`${stars} stars`}>
                        {"★".repeat(stars)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {
                        [
                          "Best in town — the team was incredibly helpful.",
                          "Quick service, will definitely come back.",
                          "Good food, lovely staff.",
                        ][i]
                      }
                    </p>
                    <p className="mt-2 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                      ✓ AI reply drafted — ready to send
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-float absolute -right-2 top-10 hidden rotate-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:block [animation-delay:-4s]">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM19 19h2v2h-2z" />
                </svg>
              </div>
              <p className="mt-1.5 text-[9px] font-semibold text-zinc-600 dark:text-zinc-300">
                Scan to review
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Everything local businesses need
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              From the first scan to the published reply — one toolkit for your
              Google presence.
            </p>
          </div>
          <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card-lift rounded-2xl border border-zinc-200/80 bg-white/80 p-6 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <Icon>{f.icon}</Icon>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Up and running in three steps
            </h2>
          </div>
          <ol className="stagger mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative text-center sm:text-left">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full brand-gradient text-sm font-bold text-white shadow-lg shadow-indigo-500/25 sm:mx-0">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl brand-gradient px-8 py-14 text-center shadow-2xl shadow-indigo-500/25">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-white/20 blur-3xl"
            />
            <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to get found on Google?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/85">
              Connect your profile, print your QR, and let the AI handle the
              busywork.
            </p>
            <Link
              href="/signup"
              className="relative mt-7 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-zinc-50"
            >
              Start free
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-200/70 dark:border-zinc-800/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo size="sm" />
          <div className="flex items-center gap-5 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/privacy" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Terms of Service
            </Link>
            <span>© {new Date().getFullYear()} GBP Suite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
