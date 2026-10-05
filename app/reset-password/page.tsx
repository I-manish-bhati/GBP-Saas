import { ResetPasswordForm } from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : null;

  if (!token) {
    return (
      <ResetPasswordForm
        token={null}
        error="This reset link is missing its token. Request a new one."
      />
    );
  }

  return <ResetPasswordForm token={token} error={null} />;
}
