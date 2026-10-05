"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteJson, patchJson, postJson } from "@/lib/client-api";

export interface ImageRow {
  id: string;
  image_url: string;
  cloudinary_public_id: string;
  caption: string | null;
  uploaded_at: string;
}

interface UploadTicket {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

function ImageCard({
  locationId,
  image,
}: {
  locationId: string;
  image: ImageRow;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(image.caption ?? "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveCaption() {
    if (!dirty) return;
    setBusy(true);
    setError(null);
    try {
      const res = await patchJson(
        `/api/locations/${locationId}/images/${image.id}`,
        { caption }
      );
      if (!res.ok) setError(res.error);
      setDirty(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this image?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteJson(
        `/api/locations/${locationId}/images/${image.id}`
      );
      if (res.ok) router.refresh();
      else setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.image_url}
        alt={image.caption ?? "Location image"}
        className="h-32 w-full object-cover"
        loading="lazy"
      />
      <div className="flex flex-col gap-1 p-2">
        <input
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            setDirty(true);
          }}
          onBlur={() => void saveCaption()}
          placeholder="Add a caption (used by AI)"
          maxLength={300}
          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">
            {image.uploaded_at.slice(0, 10)}
          </span>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {busy ? "…" : "Delete"}
          </button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </li>
  );
}

export function ImageGallery({
  locationId,
  images,
}: {
  locationId: string;
  images: ImageRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10 MB.");
        return;
      }

      const signRes = await postJson(`/api/locations/${locationId}/images/sign`, {});
      if (!signRes.ok) {
        if (signRes.data && signRes.data.code === "CLOUDINARY_NOT_CONFIGURED") {
          setNotConfigured(true);
        }
        setError(signRes.error);
        return;
      }
      const ticket = signRes.data as unknown as UploadTicket;

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", ticket.apiKey);
      form.append("timestamp", String(ticket.timestamp));
      form.append("signature", ticket.signature);
      form.append("folder", ticket.folder);

      const up = await fetch(ticket.uploadUrl, { method: "POST", body: form });
      if (!up.ok) {
        setError(`Cloudinary upload failed (${up.status}). Try again.`);
        return;
      }
      const uploaded = (await up.json()) as {
        public_id?: string;
        secure_url?: string;
      };
      if (!uploaded.public_id || !uploaded.secure_url) {
        setError("Cloudinary returned an unexpected response.");
        return;
      }

      const saveRes = await postJson(`/api/locations/${locationId}/images`, {
        cloudinary_public_id: uploaded.public_id,
        image_url: uploaded.secure_url,
        caption: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 300),
      });
      if (!saveRes.ok) {
        setError(saveRes.error);
        return;
      }
      router.refresh();
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="mb-3 flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          className="block text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-50 disabled:opacity-50 dark:text-zinc-400 dark:file:border-zinc-600 dark:file:bg-zinc-800 dark:file:text-zinc-200"
        />
        {busy ? <span className="text-xs text-zinc-500">Uploading…</span> : null}
      </div>
      {notConfigured ? (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Image upload is not configured yet (Cloudinary keys pending in env).
        </p>
      ) : null}
      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No images yet. Upload photos to use in your Google posts.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <ImageCard key={img.id} locationId={locationId} image={img} />
          ))}
        </ul>
      )}
    </div>
  );
}
