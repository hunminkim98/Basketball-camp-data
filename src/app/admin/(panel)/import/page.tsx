import type { Metadata } from "next";
import { sortCamps } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "엑셀 업로드" };

export default async function ImportPage() {
  const ds = await loadDataset();
  return (
    <>
      <PageTitle sub="엑셀 업로드 → 캠프 선택/생성 → 미리보기 → 저장">엑셀 업로드</PageTitle>
      <ImportWizard camps={sortCamps(ds.camps).reverse()} />
    </>
  );
}
