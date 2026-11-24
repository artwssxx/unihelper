"use client";

import { useState } from "react";

const LAYERS = [
  { name: "Учёба и тесты", tag: "ФУНДАМЕНТ", what: "GPA, профильные предметы, IELTS и SAT. Это фильтр: без нужного минимума заявку часто даже не рассматривают.", how: "Сравниваем с требованиями каждой программы и даём моки, чтобы поднять балл до нужного уровня." },
  { name: "Активности и проекты", tag: "ГЛУБИНА", what: "Не количество кружков, а глубина: что ты делал долго, чего добился и связано ли это со специальностью.", how: "Лента олимпиад, волонтёрства и летних школ под твои цели. Участие, подтверждённое организатором, само попадает в портфолио." },
  { name: "Эссе", tag: "ГОЛОС", what: "Главный способ показать, кто ты. Для многих грантов весит больше оценок.", how: "ИИ разбирает структуру, клише и конкретику, задаёт вопросы — но не пишет текст за тебя." },
  { name: "Рекомендации", tag: "ДОВЕРИЕ", what: "Учителя подтверждают, что твои достижения настоящие. Просить нужно заранее.", how: "Дорожная карта напомнит, когда просить." },
  { name: "Интервью", tag: "ЖИВОЙ КОНТАКТ", what: "У GKS, части грантов и топ-вузов есть интервью — к нему готовятся так же, как к тесту.", how: "Симулятор интервью с обратной связью — в следующих обновлениях." },
  { name: "Финансирование", tag: "ДЕНЬГИ", what: "Поступить и получить грант — разные задачи. Не все программы дают деньги иностранцам.", how: "Funding Fit по каждой программе и обязательный запасной вариант, который семья потянет без гранта." },
];

const FAQ = [
  { q: "Это заменяет консультанта?", a: "Для большинства шагов — да: подборка программ, план, проверка эссе, моки. Консультации менторов — студентов, поступивших на грант, — появятся в тарифе «Сезон»." },
  { q: "Почему вы не показываете шанс в процентах?", a: "Средние баллы поступивших не дают личной вероятности. Мы показываем, насколько ты подходишь программе и грантам, почему, и что ещё не оценено." },
  { q: "Откуда данные о требованиях и дедлайнах?", a: "С официальных сайтов вузов и грантов. Пока данные проходят проверку экспертом, они помечены «ориентировочно» — сверяй даты и суммы по ссылке на официальный сайт." },
  { q: "Насколько точен балл мока?", a: "Это примерная оценка диапазоном, а не официальный балл. Перед экзаменом советуем пройти и официальные пробники." },
  { q: "Есть ли узбекские вузы?", a: "Да, частные вузы и филиалы зарубежных университетов — часто это хороший запасной вариант." },
];

export function Layers() {
  const [layer, setLayer] = useState(0);
  const c = LAYERS[layer];
  return (
    <div className="flex flex-wrap gap-14">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
        {LAYERS.map((l, i) => {
          const a = i === layer;
          return (
            <button
              key={l.name}
              aria-pressed={a}
              onClick={() => setLayer(i)}
              className={`flex items-center gap-3.5 rounded-[14px] border px-[18px] py-3.5 text-left text-base font-bold transition-all ${a ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink"}`}
              style={{ width: `${100 - i * 5}%` }}
            >
              <span className={`h-2.5 w-2.5 flex-none rounded-full ${a ? "bg-peach" : "bg-[#C7D4EE]"}`} />
              {l.name}
            </button>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-[1_1_400px] flex-col justify-center rounded-[28px] bg-bg p-8 md:p-10" aria-live="polite">
        <div className="text-[13px] font-extrabold text-primary">{c.tag}</div>
        <h3 className="mt-2.5 text-[34px] font-extrabold tracking-[-0.02em]">{c.name}</h3>
        <p className="mt-4 text-[17px] leading-relaxed text-body">{c.what}</p>
        <div className="mt-7 rounded-[18px] border border-line bg-surface px-[22px] py-5">
          <div className="text-[13px] font-extrabold text-orange-ink">В UNIHELPER</div>
          <p className="mt-2 text-base leading-relaxed">{c.how}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      {FAQ.map((f, i) => {
        const o = i === open;
        return (
          <div key={f.q} className="rounded-[18px] border border-line bg-surface">
            <button aria-expanded={o} onClick={() => setOpen(o ? -1 : i)} className="flex w-full items-center justify-between gap-4 bg-transparent px-6 py-5 text-left text-[17px] font-bold">
              {f.q}
              <span className="flex-none text-[22px] text-primary">{o ? "−" : "+"}</span>
            </button>
            {o && <p className="m-0 px-6 pb-[22px] text-[15px] leading-relaxed text-body">{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
