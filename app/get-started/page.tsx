import { redirect } from "next/navigation";

export default async function GetStartedRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => nextParams.append(key, item));
      } else if (value) {
        nextParams.set(key, value);
      }
    });
  }

  if (!nextParams.has("source")) {
    nextParams.set("source", "get-started");
  }

  redirect(`/start-now?${nextParams.toString()}`);
}
