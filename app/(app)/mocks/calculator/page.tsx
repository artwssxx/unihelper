import Link from "next/link";
import Calculator from "@/components/calc/Calculator";

export const metadata = { title: "UniHelper — графический калькулятор" };

export default function CalculatorPage() {
  return (
    <div className="space-y-4">
      <section>
        <Link href="/mocks" className="text-sm font-bold text-primary">← Моки</Link>
        <h1 className="mt-2 text-[30px] font-extrabold tracking-tight sm:text-[38px]">Графический калькулятор</h1>
        <p className="mt-1 max-w-[760px] text-body">
          Тот же, что в моке SAT Math, — как Desmos в Bluebook: графики и неравенства, ползунки (<code>a = 2</code>), функции <code>f(x)</code>, точки, таблицы с регрессией. Нажми на график — появятся корни, вершина и пересечения.
        </p>
      </section>
      <Calculator mode="page" />
    </div>
  );
}
