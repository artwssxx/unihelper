import Link from "next/link";

export default function NeedProfile({ text = "Сначала оцени профиль — это 3 минуты и 8 вопросов." }: { text?: string }) {
  return (
    <div className="card mx-auto max-w-xl space-y-4 text-center">
      <h1 className="text-2xl font-extrabold">Начнём с профиля</h1>
      <p className="text-body">{text}</p>
      <Link href="/quiz" className="btn-primary">Оценить профиль</Link>
    </div>
  );
}
