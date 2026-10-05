import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const get = (key: string): string | undefined =>
    typeof sp[key] === "string" ? (sp[key] as string) : undefined;

  return (
    <LoginForm
      next={get("next")}
      notice={
        get("verified") === "1"
          ? "verified"
          : get("verify_error") === "1"
            ? "verify_error"
            : get("reset") === "1"
              ? "reset"
              : null
      }
    />
  );
}
