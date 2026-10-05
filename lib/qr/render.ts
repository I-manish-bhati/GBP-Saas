import "server-only";
import QRCode from "qrcode";

/**
 * M9 QR generator (FR-24/FR-25): encodes `${APP_URL}/r/{slug}` with error
 * correction H, 4-module quiet zone, dark-on-light enforced (#000 on #fff)
 * regardless of template/brand colors.
 */

export const QR_TEMPLATES = [
  { id: "minimal", label: "Minimal" },
  { id: "classic", label: "Classic" },
  { id: "badge", label: "Badge" },
  { id: "pop", label: "Pop" },
] as const;

export type QrTemplateId = (typeof QR_TEMPLATES)[number]["id"];

export function isQrTemplateId(value: string): value is QrTemplateId {
  return QR_TEMPLATES.some((t) => t.id === value);
}

const BASE_OPTS = {
  errorCorrectionLevel: "H",
  margin: 4,
  color: { dark: "#000000ff", light: "#ffffffff" },
} as const;

export function reviewUrl(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/$/, "")}/r/${slug}`;
}

/** Raw QR as SVG text (dark-on-light, quiet zone included in viewBox). */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...BASE_OPTS, type: "svg" });
}

/** QR as PNG buffer at 2x display size (FR-25). */
export async function qrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, { ...BASE_OPTS, type: "png", width: 800 });
}

export interface PosterInput {
  url: string;
  shopName: string;
  tagline: string | null;
  brandColor: string | null;
  template: string;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isValidHex(color: string | null): color is string {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);
}

function textLines(
  name: string,
  tagline: string,
  x: number,
  nameY: number,
  taglineY: number,
  nameColor: string,
  taglineColor: string
): string {
  return (
    `<text x="${x}" y="${nameY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" fill="${nameColor}">${xmlEscape(name)}</text>` +
    (tagline
      ? `<text x="${x}" y="${taglineY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="${taglineColor}">${xmlEscape(tagline)}</text>`
      : "")
  );
}

/**
 * Composed print poster (SVG): template frame + brand color + shop name +
 * tagline around the QR panel. The QR itself always sits on white.
 */
export async function posterSvg(input: PosterInput): Promise<string> {
  const rawQr = await qrSvg(input.url);
  const viewBox = rawQr.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 100 100";
  const qrInner = rawQr
    .replace(/^<\?xml[^>]*\?>/, "")
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  const name = input.shopName || "Scan to review";
  const tagline = (input.tagline ?? "").trim();
  const brand = isValidHex(input.brandColor) ? input.brandColor : "#18181b";
  const W = 600;
  const H = 800;
  const qrX = 100;
  const qrY = 220;
  const qrSize = 400;

  const qrNode = `<svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${qrInner}</svg>`;

  let body = "";
  switch (input.template) {
    case "classic":
      body =
        `<rect x="0" y="0" width="${W}" height="140" fill="${brand}"/>` +
        textLines(name, tagline, W / 2, 70, 110, "#ffffff", "#f4f4f5") +
        `<rect x="${qrX - 24}" y="${qrY - 24}" width="${qrSize + 48}" height="${qrSize + 48}" rx="8" fill="#ffffff" stroke="#e4e4e7" stroke-width="2"/>` +
        qrNode +
        `<text x="${W / 2}" y="${qrY + qrSize + 60}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#52525b">Scan to review us on Google</text>`;
      break;
    case "badge":
      body =
        `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="28" fill="#ffffff" stroke="${brand}" stroke-width="10"/>` +
        `<circle cx="${W / 2}" cy="110" r="46" fill="${brand}"/>` +
        `<text x="${W / 2}" y="124" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700" fill="#ffffff">★</text>` +
        textLines(name, tagline, W / 2, 200, 236, "#18181b", "#71717a") +
        qrNode +
        `<text x="${W / 2}" y="${qrY + qrSize + 56}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#52525b">Tap or scan to write a review</text>`;
      break;
    case "pop":
      body =
        `<rect x="0" y="0" width="${W}" height="${H}" fill="${brand}"/>` +
        `<rect x="50" y="60" width="${W - 100}" height="${H - 120}" rx="24" fill="#ffffff"/>` +
        textLines(name, tagline, W / 2, 150, 190, "#18181b", "#71717a") +
        qrNode +
        `<text x="${W / 2}" y="${qrY + qrSize + 56}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#52525b">Scan to share your experience</text>`;
      break;
    default: // minimal
      body =
        `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>` +
        `<rect x="0" y="0" width="${W}" height="10" fill="${brand}"/>` +
        textLines(name, tagline, W / 2, 130, 170, "#18181b", "#71717a") +
        qrNode +
        `<text x="${W / 2}" y="${qrY + qrSize + 56}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#52525b">Scan to leave a Google review</text>`;
  }

  return `<!-- source: ${xmlEscape(input.url)} --><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${body}</svg>`;
}
