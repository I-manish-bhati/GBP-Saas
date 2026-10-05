import { NextResponse } from "next/server";
import { getCloudinaryConfig, issueUploadTicket } from "@/lib/cloudinary/sign";
import { guardLocation } from "../../../_lib";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ locationId: string }> }
) {
  const { locationId } = await ctx.params;
  const guard = await guardLocation(locationId);
  if (guard instanceof NextResponse) return guard;

  if (!getCloudinaryConfig()) {
    return NextResponse.json(
      {
        error:
          "Image upload is not configured yet (Cloudinary keys pending).",
        code: "CLOUDINARY_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const ticket = issueUploadTicket(guard.locationId);
  if (!ticket) {
    return NextResponse.json(
      { error: "Cloudinary not configured", code: "CLOUDINARY_NOT_CONFIGURED" },
      { status: 503 }
    );
  }
  return NextResponse.json(ticket);
}
