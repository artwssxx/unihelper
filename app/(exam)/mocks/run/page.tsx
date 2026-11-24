import { redirect } from "next/navigation";
import MockRunner from "@/components/mock/MockRunner";
import type { Exam, Mode, Section } from "@/lib/mocks/types";

export const metadata = { title: "UniHelper — мок" };

export default async function RunPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const exam = sp.exam as Exam;
  const section = sp.section as Section;
  const mode = (sp.mode === "hard" ? "hard" : "light") as Mode;
  const ok = (exam === "sat" && (section === "math" || section === "rw")) || (exam === "ielts" && (section === "reading" || section === "writing"));
  if (!ok) redirect("/mocks");
  return <MockRunner key={`${exam}-${section}-${mode}`} exam={exam} section={section} mode={mode} />;
}
