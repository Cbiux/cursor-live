import { PresenterExperience } from "@/components/presenter-experience";

export default async function PresentPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = (params.code ?? "CURSORCR")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return <PresenterExperience code={code || "CURSORCR"} />;
}
