"use client";

import { useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/client-api";

interface TagRow {
  label: string;
  min_rating: number;
  max_rating: number;
  category: string | null;
}

interface Props {
  slug: string;
  isAuthenticated: boolean;
  devLoginAvailable: boolean;
  loginError: string | null;
  tags: TagRow[];
  location: { name: string; city: string | null; google_place_id: string | null };
}

type CopyState = "idle" | "auto" | "manual" | "failed";

const RATING_WORDS = ["Poor", "Fair", "Okay", "Good", "Great"];

export function ReviewFlow({
  slug,
  isAuthenticated,
  devLoginAvailable,
  loginError,
  tags,
  location,
}: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [devBusy, setDevBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);

  const visibleTags = tags.filter(
    (t) => rating !== null && t.min_rating <= rating && rating <= t.max_rating
  );

  useEffect(() => {
    if (submittedId) successRef.current?.focus();
  }, [submittedId]);

  async function copyToClipboard(value: string): Promise<CopyState> {
    try {
      await navigator.clipboard.writeText(value);
      return "auto";
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok ? "manual" : "failed";
    }
  }

  function pickRating(n: number): void {
    setRating(n);
    setAiError(null);
    setFormError(null);
    setSelectedTags((prev) =>
      prev.filter((label) => {
        const t = tags.find((x) => x.label === label);
        return t ? t.min_rating <= n && n <= t.max_rating : false;
      })
    );
  }

  function toggleTag(label: string): void {
    setSelectedTags((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  async function generateDraft(): Promise<void> {
    if (rating === null || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    const res = await postJson(`/api/qr/${slug}/generate`, {
      rating,
      tags: selectedTags,
    });
    setAiBusy(false);
    if (res.ok && res.data && typeof (res.data as { draft?: unknown }).draft === "string") {
      const draft = (res.data as { draft: string }).draft;
      setText(draft);
      setAiDraft(draft);
      if (textareaRef.current) textareaRef.current.focus();
    } else {
      setAiError(res.error ?? "AI draft unavailable.");
    }
  }

  async function submitReview(): Promise<void> {
    if (submitBusy) return;
    if (rating === null) {
      setFormError("Please choose a star rating first.");
      return;
    }
    if (text.trim().length === 0) {
      setFormError("Please write your review (or draft it with AI first).");
      return;
    }
    setSubmitBusy(true);
    setFormError(null);
    const res = await postJson("/api/review-submissions", {
      slug,
      rating,
      tags: selectedTags,
      ai_draft: aiDraft,
      final_text: text.slice(0, 4096),
    });
    setSubmitBusy(false);
    if (res.ok && res.data && typeof (res.data as { id?: unknown }).id === "string") {
      const id = (res.data as { id: string }).id;
      setSubmittedId(id);
      const state = await copyToClipboard(text);
      setCopyState(state);
    } else {
      setFormError(res.error ?? "Could not submit your review.");
    }
  }

  async function devLogin(): Promise<void> {
    setDevBusy(true);
    const res = await postJson("/api/auth/dev-customer-login", {});
    if (res.ok) {
      window.location.reload();
    } else {
      setFormError(res.error ?? "Dev sign-in failed.");
      setDevBusy(false);
    }
  }

  function onGooglePost(): void {
    if (!submittedId) return;
    void postJson(`/api/review-submissions/${submittedId}/clicked`, {});
  }

  const googleUrl = location.google_place_id
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(location.google_place_id)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.name + (location.city ? " " + location.city : "")
      )}`;

  /* ---------------- login gate ---------------- */
  if (!isAuthenticated) {
    return (
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {loginError ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            Sign-in failed: {loginError}. Please try again.
          </p>
        ) : null}
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Sign in to write your review
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          One quick step — we keep your draft safe until you post it.
        </p>
        <a
          href={`/api/auth/customer-google/start?next=${encodeURIComponent(`/r/${slug}`)}`}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.5z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-6.9-5.1L1.2 17C3.2 21.1 7.3 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.1 14.3c-.3-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.2 6.7C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l3.9-3z"
            />
            <path
              fill="#EA4335"
              d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.2 2.9 1.2 6.7l3.9 3c.9-3 3.7-5 6.9-5z"
            />
          </svg>
          Continue with Google
        </a>
        {devLoginAvailable ? (
          <button
            type="button"
            onClick={devLogin}
            disabled={devBusy}
            className="mt-3 min-h-11 w-full rounded-xl px-4 py-2 text-xs text-zinc-400 underline hover:text-zinc-600 disabled:opacity-50"
          >
            {devBusy ? "Signing in…" : "Dev sign-in (local testing only)"}
          </button>
        ) : null}
        {formError ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {formError}
          </p>
        ) : null}
      </div>
    );
  }

  /* ---------------- success screen ---------------- */
  if (submittedId) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm outline-none dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Your review is ready
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {copyState === "auto"
            ? "Copied to your clipboard — paste it on Google below."
            : copyState === "manual"
              ? "Tap the text, then copy it on Google."
              : copyState === "failed"
                ? "Select and copy the text below before posting."
                : ""}
        </p>
        <textarea
          readOnly
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-3 min-h-32 w-full resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={() => {
            void copyToClipboard(text).then(setCopyState);
          }}
          className="mt-3 min-h-12 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {copyState === "auto" ? "Copy again" : "Copy my review"}
        </button>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onGooglePost}
          className="mt-3 flex min-h-14 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white hover:bg-blue-700"
        >
          Post on Google ↗
        </a>
        <p className="mt-3 text-center text-xs text-zinc-400">
          You can also paste your text into Google manually.
        </p>
      </div>
    );
  }

  /* ---------------- main form ---------------- */
  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <fieldset>
        <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          How was your experience?
        </legend>
        <div className="mt-3 flex justify-between gap-2" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""} - ${RATING_WORDS[n - 1]}`}
              onClick={() => pickRating(n)}
              className={`flex h-14 flex-1 flex-col items-center justify-center rounded-xl border-2 text-xs font-medium transition ${
                rating === n
                  ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700"
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {rating !== null && rating >= n ? "★" : "☆"}
              </span>
              <span className="mt-1">{RATING_WORDS[n - 1]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {visibleTags.length > 0 ? (
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            What stood out? <span className="font-normal text-zinc-400">(optional)</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleTags.map((t) => {
              const active = selectedTags.includes(t.label);
              return (
                <button
                  key={t.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(t.label)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <button
        type="button"
        onClick={generateDraft}
        disabled={rating === null || aiBusy}
        className="mt-5 min-h-12 w-full rounded-xl border border-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {aiBusy ? "Drafting with AI…" : "Draft with AI (editable)"}
      </button>
      {aiError ? (
        <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          {aiError}
        </p>
      ) : null}

      <label htmlFor="review-text" className="mt-5 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        Your review
      </label>
      <textarea
        id="review-text"
        ref={textareaRef}
        value={text}
        maxLength={4096}
        onChange={(e) => setText(e.target.value.slice(0, 4096))}
        placeholder="Write your review, or tap “Draft with AI” to start…"
        className="mt-2 min-h-36 w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <p className="mt-1 text-right text-xs text-zinc-400">{text.length}/4096</p>

      {formError ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submitReview}
        disabled={submitBusy}
        className="mt-4 min-h-14 w-full rounded-xl bg-zinc-900 px-4 py-4 text-base font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {submitBusy ? "Saving…" : "Continue to Google"}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-400">
        Your text is copied for you on the next step — then paste it into Google.
      </p>
    </div>
  );
}
