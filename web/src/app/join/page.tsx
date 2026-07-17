import { AudienceExperience } from "@/components/audience-experience";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = (params.code ?? "CURSORCR")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return <AudienceExperience code={code || "CURSORCR"} />;
}
