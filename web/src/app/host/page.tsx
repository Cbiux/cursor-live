import { HostStudio } from "@/components/host-studio";

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = (params.code ?? "CURSORCR")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return <HostStudio initialCode={code || "CURSORCR"} />;
}
