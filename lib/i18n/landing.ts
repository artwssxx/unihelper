// Тексты лендинга v4 на трёх языках. Узбекский — латиница.

export type Lang = "ru" | "uz" | "en";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "uz", label: "UZ" },
  { id: "ru", label: "RU" },
  { id: "en", label: "EN" },
];

type Item = { title: string; text: string };

export interface LandingDict {
  nav: { play: string; path: string; features: string; pricing: string; faq: string; demo: string; login: string; start: string; theme: string };
  hero: {
    badgeNew: string; badge: string;
    pre: string; rot: string[]; post: string; l2pre: string; accent: string; l2post: string;
    sub: string; cta: string; how: string; core: string; coreSub: string; sticker: string; essay: string;
  };
  marquee: string[];
  play: {
    eyebrow: string; titlePre: string; titleAccent: string; titlePost: string;
    gpa: string; ielts: string; sat: string; act: string; essay: string; note: string;
    strength: string; improve: string; levels: [string, string, string, string];
    tips: { ielts: string; act: string; essay: string; sat: string; ok: string };
    p1: string; p1s: string; p2: string; p2s: string; p3: string; p3s: string;
    pills: { no: string; real: string; amb: string; high: string; backup: string };
  };
  fit: { eyebrow: string; titlePre: string; titleAccent: string; titlePost: string; text: string; cards: [Item, Item, Item] };
  path: { eyebrow: string; titlePre: string; titleAccent: string; steps: [Item, Item, Item, Item, Item] };
  features: {
    eyebrow: string; titlePre: string; titleAccent: string; titlePost: string;
    mocks: Item & { light: string; hard: string; lightTag: string; hardTag: string; progress: string; lightNote: string; hardNote: string };
    advisor: Item & { q: string; a: string };
    roadmap: Item & { checks: [string, string, string, string] };
    events: Item & { event: string; ticket: string };
    lessons: Item & { lesson: string; of: string };
    portfolio: Item & { bio: string };
    local: Item & { tags: [string, string, string, string] };
  };
  pricing: {
    eyebrow: string; titlePre: string; titleAccent: string; popular: string;
    plans: { name: string; amt: string; per?: string; items: string[]; cta: string }[];
  };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { titlePre: string; titleAccent: string; titlePost: string; countries: { id: string; label: string }[]; go: string; goFor: string; note: string };
  footer: { tagline: string; product: string; partners: string; schools: string; unis: string; organizers: string; demo: string; investors: string };
}

const ru: LandingDict = {
  nav: { play: "Попробовать", path: "Путь", features: "Возможности", pricing: "Цены", faq: "FAQ", demo: "Демо", login: "Войти", start: "Начать", theme: "Переключить тему" },
  hero: {
    badgeNew: "новое", badge: "Моки SAT и IELTS с хард-режимом",
    pre: "Поступай ", rot: ["в Корею", "в Венгрию", "в США", "в Германию", "в Турцию", "в Ташкенте"], post: "", l2pre: "по ", accent: "плану", l2post: ", а не наугад.",
    sub: "Портфолио, честная оценка, подбор программ и грантов, моки и дорожная карта — в одном месте. На узбекском, русском и английском.",
    cta: "Собрать профиль", how: "Как это работает", core: "Твой профиль", coreSub: "в центре плана", sticker: "без «шансов в %»", essay: "Эссе",
  },
  marquee: ["Stipendium Hungaricum", "GKS Korea", "Türkiye Bursları", "DAAD", "Need-based aid США", "Частные вузы Узбекистана", "IELTS", "SAT"],
  play: {
    eyebrow: "ПОПРОБУЙ ПРЯМО ЗДЕСЬ", titlePre: "Подвигай ползунки — увидишь, как ", titleAccent: "меняется", titlePost: " твой план.",
    gpa: "GPA (из 5)", ielts: "IELTS", sat: "SAT (или по моку)", act: "Сильные активности и проекты", essay: "Эссе проверено в Unihelper",
    note: "Демо с упрощёнными правилами. В продукте требования берутся с официальных сайтов и проверяются экспертом.",
    strength: "Profile Strength", improve: "ЧТО ПРОКАЧАТЬ", levels: ["Начальный", "Развивающийся", "Сильный", "Очень сильный"],
    tips: {
      ielts: "IELTS ниже 6.0 закрывает большинство грантов. Начни с моков IELTS Reading и Writing.",
      act: "Активностей мало. Загляни в ивенты: олимпиады и проекты под твою специальность.",
      essay: "Эссе ещё не оценено — без него высокое соответствие невозможно.",
      sat: "Подтяни SAT: моки в хард-режиме и уроки по слабым темам.",
      ok: "Профиль сильный. Сфокусируйся на эссе под каждую программу и рекомендациях.",
    },
    p1: "Частный вуз в Ташкенте", p1s: "мин. IELTS 5.5 · без гранта", p2: "Вуз в Венгрии · Stipendium Hungaricum", p2s: "мин. IELTS 6.0 · полный грант", p3: "Топ-вуз в Корее · GKS", p3s: "мин. IELTS 6.5 · эссе и интервью решают",
    pills: { no: "не соответствует", real: "реалистично", amb: "амбициозно", high: "высокое соответствие", backup: "запасной вариант" },
  },
  fit: {
    eyebrow: "ЧЕСТНАЯ ОЦЕНКА", titlePre: "Три оценки вместо одной ", titleAccent: "цифры", titlePost: ".",
    text: "Средние баллы поступивших не скажут, поступишь ли именно ты. Поэтому мы показываем причины, требования и то, что ещё не оценено. Наведи на карточки.",
    cards: [
      { title: "Profile Strength", text: "Насколько силён профиль сам по себе." },
      { title: "Admission Fit", text: "Насколько ты подходишь конкретной программе — требования, портфолио, эссе, конкурс." },
      { title: "Funding Fit", text: "Реально ли получить деньги. Отдельно от поступления." },
    ],
  },
  path: {
    eyebrow: "ТВОЙ ПУТЬ", titlePre: "От 9 класса до письма о ", titleAccent: "зачислении",
    steps: [
      { title: "9 класс · старт", text: "Профиль, Profile Strength, первые цели и дорожная карта." },
      { title: "10 класс · тесты", text: "Моки SAT и IELTS, уроки по слабым темам, официальный экзамен." },
      { title: "Лето · активности", text: "Ивенты, олимпиады, проект. Участие с QR — сразу в портфолио." },
      { title: "11 класс · эссе", text: "Эссе с ИИ-разбором, рекомендации, сайт-портфолио." },
      { title: "Заявки отправлены", text: "Чек-листы по каждому вузу и напоминания до дедлайна." },
    ],
  },
  features: {
    eyebrow: "ВСЁ В ОДНОМ МЕСТЕ", titlePre: "Инструменты, которые ", titleAccent: "делают", titlePost: " работу за тебя.",
    mocks: { title: "SAT и IELTS моки", text: "Вопросы подбираются из банка заново для каждой попытки. В хард-режиме уйти со вкладки — значит закончить попытку.", light: "Лёгкий", hard: "Хард", lightTag: "Лёгкий режим", hardTag: "Хард-режим", progress: "SAT Math · модуль 2 · вопрос 14 / 22", lightNote: "Подсказка доступна · разбор после ответа", hardNote: "Вышел из вкладки — попытка прервана, балл не засчитан" },
    advisor: { title: "AI Advisor", text: "Отвечает с учётом профиля. Дедлайны — только со ссылкой на официальный сайт.", q: "Хватит IELTS 6.5 для GKS?", a: "Смотри требования своей программы: минимум отличается. Ссылка на официальный сайт — ниже." },
    roadmap: { title: "Дорожная карта", text: "План по месяцам и напоминания.", checks: ["SAT-мок, хард-режим", "Записаться на хакатон", "Черновик эссе", "Попросить рекомендацию"] },
    events: { title: "Ивенты в один клик", text: "Отметка по QR — сразу в портфолио с пометкой «подтверждено».", event: "Хакатон для школьников", ticket: "Билет · вы записаны" },
    lessons: { title: "Уроки", text: "Короткие уроки от студентов, поступивших на грант. После мока — по твоим слабым темам.", lesson: "Advanced Math: вершина и Виета", of: "урок 2 из 4" },
    portfolio: { title: "Сайт-портфолио за минуту", text: "Страница из твоего профиля — ссылку можно приложить к заявке. Контакты и оценки скрыты, пока ты их не откроешь.", bio: "Computer Science · олимпиада · волонтёр" },
    local: { title: "Узбекские вузы — тоже", text: "Частные вузы и филиалы зарубежных университетов. Часто это лучший запасной вариант, который семья потянет без гранта.", tags: ["Ташкент", "Самарканд", "Филиалы", "Запасной вариант"] },
  },
  pricing: {
    eyebrow: "ЦЕНЫ", titlePre: "Дешевле одного часа у ", titleAccent: "консультанта", popular: "популярный",
    plans: [
      { name: "Free", amt: "0 сум", items: ["Профиль и Profile Strength", "3 программы в списке", "1 SAT-мок в месяц", "Лента ивентов"], cta: "Начать" },
      { name: "Pro", amt: "120 000 сум", per: "в месяц", items: ["Admission Fit и Funding Fit", "Моки без лимита и хард-режим", "30 проверок эссе", "Все уроки"], cta: "Попробовать Pro" },
      { name: "Сезон", amt: "550 000 сум", per: "за 6 месяцев", items: ["Всё из Pro на весь сезон", "Консультация ментора"], cta: "Выбрать" },
      { name: "Школам", amt: "от 30 000 сум", per: "за ученика в месяц", items: ["Кабинет консультанта", "Классные пробники в хард-режиме", "Отчёты по поступлениям"], cta: "Связаться" },
    ],
  },
  faq: {
    title: "Частые вопросы",
    items: [
      { q: "Это заменяет консультанта?", a: "Для большинства шагов — да: подборка программ, план, проверка эссе, моки. Консультации менторов — студентов, поступивших на грант, — появятся в тарифе «Сезон»." },
      { q: "Почему нет шанса в процентах?", a: "Средние баллы поступивших не дают личной вероятности. Мы показываем, насколько ты подходишь программе и грантам, почему, и что ещё не оценено." },
      { q: "Откуда данные о требованиях и дедлайнах?", a: "С официальных сайтов вузов и грантов. Пока данные проходят проверку экспертом, они помечены «ориентировочно» — сверяй даты и суммы по ссылке на официальный сайт." },
      { q: "Насколько точен балл мока?", a: "Это примерная оценка диапазоном, а не официальный балл. Перед экзаменом советуем пройти и официальные пробники." },
    ],
  },
  cta: {
    titlePre: "Куда ты ", titleAccent: "хочешь", titlePost: " поступить?",
    countries: [{ id: "KR", label: "Корея" }, { id: "HU", label: "Венгрия" }, { id: "US", label: "США" }, { id: "DE", label: "Германия" }, { id: "TR", label: "Турция" }, { id: "UZ", label: "Узбекистан" }],
    go: "Узнать за 3 минуты →", goFor: "Подобрать программы: {c} →", note: "Бесплатно. Регистрация нужна, только чтобы сохранить план.",
  },
  footer: { tagline: "Помощник по поступлению за рубеж и в частные вузы Узбекистана.", product: "Продукт", partners: "Партнёрам", schools: "Школам", unis: "Вузам", organizers: "Организаторам", demo: "Демо", investors: "Для инвесторов" },
};

const uz: LandingDict = {
  nav: { play: "Sinab ko‘rish", path: "Yo‘l", features: "Imkoniyatlar", pricing: "Narxlar", faq: "FAQ", demo: "Demo", login: "Kirish", start: "Boshlash", theme: "Mavzuni almashtirish" },
  hero: {
    badgeNew: "yangi", badge: "Qattiq rejimli SAT va IELTS sinov testlari",
    pre: "", rot: ["Koreyaga", "Vengriyaga", "AQShga", "Germaniyaga", "Turkiyaga", "Toshkentga"], post: " o‘qishga kir —", l2pre: "", accent: "reja", l2post: " bilan, tavakkal emas.",
    sub: "Portfolio, halol baho, dastur va grantlarni tanlash, sinov testlari va yo‘l xaritasi — bir joyda. O‘zbek, rus va ingliz tillarida.",
    cta: "Profil yaratish", how: "Qanday ishlaydi", core: "Sening profiling", coreSub: "reja markazida", sticker: "«% imkoniyat»siz", essay: "Esse",
  },
  marquee: ["Stipendium Hungaricum", "GKS Korea", "Türkiye Bursları", "DAAD", "AQShda need-based aid", "O‘zbekistondagi xususiy OTMlar", "IELTS", "SAT"],
  play: {
    eyebrow: "SHU YERDA SINAB KO‘R", titlePre: "Slayderlarni sur — rejang qanday ", titleAccent: "o‘zgarishini", titlePost: " ko‘rasan.",
    gpa: "GPA (5 dan)", ielts: "IELTS", sat: "SAT (yoki sinov bo‘yicha)", act: "Kuchli faoliyat va loyihalar", essay: "Esse Unihelperda tekshirilgan",
    note: "Soddalashtirilgan qoidalar bilan demo. Mahsulotda talablar rasmiy saytlardan olinadi va ekspert tomonidan tekshiriladi.",
    strength: "Profile Strength", improve: "NIMANI KUCHAYTIRISH", levels: ["Boshlang‘ich", "Rivojlanmoqda", "Kuchli", "Juda kuchli"],
    tips: {
      ielts: "IELTS 6.0 dan past bo‘lsa, ko‘pchilik grantlar yopiq. IELTS Reading va Writing sinov testlaridan boshla.",
      act: "Faoliyat kam. Tadbirlarni ko‘r: mutaxassisligingga mos olimpiada va loyihalar.",
      essay: "Esse hali baholanmagan — usiz yuqori moslik bo‘lmaydi.",
      sat: "SATni oshir: qattiq rejimdagi sinov testlari va zaif mavzular bo‘yicha darslar.",
      ok: "Profil kuchli. Har bir dastur uchun esse va tavsiyanomalarga e’tibor qarat.",
    },
    p1: "Toshkentdagi xususiy OTM", p1s: "min. IELTS 5.5 · grantsiz", p2: "Vengriyadagi OTM · Stipendium Hungaricum", p2s: "min. IELTS 6.0 · to‘liq grant", p3: "Koreyadagi top OTM · GKS", p3s: "min. IELTS 6.5 · esse va intervyu hal qiladi",
    pills: { no: "mos emas", real: "real", amb: "ambitsiyali", high: "yuqori moslik", backup: "zaxira variant" },
  },
  fit: {
    eyebrow: "HALOL BAHO", titlePre: "Bitta ", titleAccent: "raqam", titlePost: " o‘rniga uchta baho.",
    text: "Qabul qilinganlarning o‘rtacha ballari aynan sen kira olasanmi — buni aytmaydi. Shuning uchun sabablar, talablar va hali baholanmagan narsalarni ko‘rsatamiz. Kartalar ustiga olib bor.",
    cards: [
      { title: "Profile Strength", text: "Profil o‘zi qanchalik kuchli." },
      { title: "Admission Fit", text: "Aniq dasturga qanchalik mossan — talablar, portfolio, esse, tanlov." },
      { title: "Funding Fit", text: "Pul olish real-mi. Qabuldan alohida." },
    ],
  },
  path: {
    eyebrow: "SENING YO‘LING", titlePre: "9-sinfdan ", titleAccent: "qabul xatigacha",
    steps: [
      { title: "9-sinf · start", text: "Profil, Profile Strength, birinchi maqsadlar va yo‘l xaritasi." },
      { title: "10-sinf · testlar", text: "SAT va IELTS sinov testlari, zaif mavzular bo‘yicha darslar, rasmiy imtihon." },
      { title: "Yoz · faoliyat", text: "Tadbirlar, olimpiadalar, loyiha. QR bilan ishtirok — darhol portfolioga." },
      { title: "11-sinf · esse", text: "SI tahlili bilan esse, tavsiyanomalar, portfolio sayt." },
      { title: "Arizalar yuborildi", text: "Har bir OTM bo‘yicha cheklistlar va muddatgacha eslatmalar." },
    ],
  },
  features: {
    eyebrow: "HAMMASI BIR JOYDA", titlePre: "Ishni sen uchun ", titleAccent: "bajaradigan", titlePost: " vositalar.",
    mocks: { title: "SAT va IELTS sinov testlari", text: "Har bir urinish uchun savollar bankdan qaytadan tanlanadi. Qattiq rejimda tabdan chiqish — urinish tugadi degani.", light: "Yengil", hard: "Qattiq", lightTag: "Yengil rejim", hardTag: "Qattiq rejim", progress: "SAT Math · 2-modul · 14 / 22 savol", lightNote: "Maslahat bor · javobdan keyin tahlil", hardNote: "Tabdan chiqding — urinish to‘xtatildi, ball hisoblanmadi" },
    advisor: { title: "AI Advisor", text: "Profilingni hisobga olib javob beradi. Muddatlar — faqat rasmiy sayt havolasi bilan.", q: "GKS uchun IELTS 6.5 yetadimi?", a: "Dasturingning talablarini ko‘r: minimum farq qiladi. Rasmiy sayt havolasi — pastda." },
    roadmap: { title: "Yo‘l xaritasi", text: "Oyma-oy reja va eslatmalar.", checks: ["SAT sinovi, qattiq rejim", "Xakatonga yozilish", "Esse qoralamasi", "Tavsiyanoma so‘rash"] },
    events: { title: "Bir bosishda tadbirlar", text: "QR orqali belgi — «tasdiqlangan» belgisi bilan darhol portfolioga.", event: "Maktab o‘quvchilari uchun xakaton", ticket: "Chipta · ro‘yxatdasan" },
    lessons: { title: "Darslar", text: "Grant bilan o‘qishga kirgan talabalardan qisqa darslar. Sinovdan keyin — zaif mavzularingga ko‘ra.", lesson: "Advanced Math: cho‘qqi va Viyet", of: "4 tadan 2-dars" },
    portfolio: { title: "Bir daqiqada portfolio sayt", text: "Profilingdan sahifa — havolani arizaga qo‘shish mumkin. Kontaktlar va baholar sen ochmaguningcha yashirin.", bio: "Computer Science · olimpiada · volontyor" },
    local: { title: "O‘zbek OTMlari ham", text: "Xususiy OTMlar va xorijiy universitetlar filiallari. Ko‘pincha bu oila grantsiz ko‘tara oladigan eng yaxshi zaxira variant.", tags: ["Toshkent", "Samarqand", "Filiallar", "Zaxira variant"] },
  },
  pricing: {
    eyebrow: "NARXLAR", titlePre: "Konsultantning bir soatidan ", titleAccent: "arzonroq", popular: "ommabop",
    plans: [
      { name: "Free", amt: "0 so‘m", items: ["Profil va Profile Strength", "Ro‘yxatda 3 ta dastur", "Oyiga 1 ta SAT sinovi", "Tadbirlar lentasi"], cta: "Boshlash" },
      { name: "Pro", amt: "120 000 so‘m", per: "oyiga", items: ["Admission Fit va Funding Fit", "Cheksiz sinovlar va qattiq rejim", "30 ta esse tekshiruvi", "Barcha darslar"], cta: "Pro ni sinash" },
      { name: "Mavsum", amt: "550 000 so‘m", per: "6 oyga", items: ["Butun mavsum uchun Pro", "Mentor konsultatsiyasi"], cta: "Tanlash" },
      { name: "Maktablarga", amt: "30 000 so‘mdan", per: "o‘quvchi uchun oyiga", items: ["Konsultant kabineti", "Qattiq rejimda sinfiy sinovlar", "Qabul bo‘yicha hisobotlar"], cta: "Bog‘lanish" },
    ],
  },
  faq: {
    title: "Ko‘p beriladigan savollar",
    items: [
      { q: "Bu konsultantni almashtiradimi?", a: "Ko‘p qadamlar uchun — ha: dasturlar tanlovi, reja, esse tekshiruvi, sinov testlari. Grant bilan kirgan talabalar — mentorlar bilan konsultatsiyalar «Mavsum» tarifida paydo bo‘ladi." },
      { q: "Nega foizdagi imkoniyat yo‘q?", a: "Qabul qilinganlarning o‘rtacha ballari shaxsiy ehtimollikni bermaydi. Biz dastur va grantlarga qanchalik mosligingni, nega ekanini va hali nima baholanmaganini ko‘rsatamiz." },
      { q: "Talablar va muddatlar haqidagi ma’lumot qayerdan?", a: "OTM va grantlarning rasmiy saytlaridan. Ma’lumotlar ekspert tekshiruvidan o‘tguncha «taxminiy» deb belgilangan — sana va summalarni rasmiy sayt havolasi orqali tekshir." },
      { q: "Sinov bali qanchalik aniq?", a: "Bu rasmiy ball emas, oraliq ko‘rinishidagi taxminiy baho. Imtihondan oldin rasmiy sinov testlarini ham topshirishni maslahat beramiz." },
    ],
  },
  cta: {
    titlePre: "Qayerga o‘qishga ", titleAccent: "kirmoqchisan", titlePost: "?",
    countries: [{ id: "KR", label: "Koreya" }, { id: "HU", label: "Vengriya" }, { id: "US", label: "AQSh" }, { id: "DE", label: "Germaniya" }, { id: "TR", label: "Turkiya" }, { id: "UZ", label: "O‘zbekiston" }],
    go: "3 daqiqada bilish →", goFor: "Dasturlarni tanlash: {c} →", note: "Bepul. Ro‘yxatdan o‘tish faqat rejani saqlash uchun kerak.",
  },
  footer: { tagline: "Xorijga va O‘zbekistondagi xususiy OTMlarga kirishda yordamchi.", product: "Mahsulot", partners: "Hamkorlarga", schools: "Maktablarga", unis: "OTMlarga", organizers: "Tashkilotchilarga", demo: "Demo", investors: "Investorlar uchun" },
};

const en: LandingDict = {
  nav: { play: "Try it", path: "Path", features: "Features", pricing: "Pricing", faq: "FAQ", demo: "Demo", login: "Log in", start: "Start", theme: "Toggle theme" },
  hero: {
    badgeNew: "new", badge: "SAT and IELTS mocks with hard mode",
    pre: "Study ", rot: ["in Korea", "in Hungary", "in the US", "in Germany", "in Türkiye", "in Tashkent"], post: "", l2pre: "with a ", accent: "plan", l2post: ", not by chance.",
    sub: "Portfolio, honest assessment, matching programs and scholarships, mock tests and a roadmap — in one place. In Uzbek, Russian and English.",
    cta: "Build my profile", how: "How it works", core: "Your profile", coreSub: "at the centre of the plan", sticker: "no “% chances”", essay: "Essay",
  },
  marquee: ["Stipendium Hungaricum", "GKS Korea", "Türkiye Bursları", "DAAD", "US need-based aid", "Private universities in Uzbekistan", "IELTS", "SAT"],
  play: {
    eyebrow: "TRY IT RIGHT HERE", titlePre: "Move the sliders — see how your plan ", titleAccent: "changes", titlePost: ".",
    gpa: "GPA (out of 5)", ielts: "IELTS", sat: "SAT (or mock)", act: "Strong activities and projects", essay: "Essay checked in Unihelper",
    note: "A demo with simplified rules. In the product, requirements come from official websites and are reviewed by an expert.",
    strength: "Profile Strength", improve: "WHAT TO IMPROVE", levels: ["Starting", "Developing", "Strong", "Very strong"],
    tips: {
      ielts: "IELTS below 6.0 rules out most scholarships. Start with IELTS Reading and Writing mocks.",
      act: "Not many activities yet. Check events: olympiads and projects in your field.",
      essay: "Your essay isn't assessed yet — without it a high fit isn't possible.",
      sat: "Raise your SAT: hard-mode mocks and lessons on weak topics.",
      ok: "Strong profile. Focus on essays for each program and on recommendations.",
    },
    p1: "Private university in Tashkent", p1s: "min. IELTS 5.5 · no scholarship", p2: "University in Hungary · Stipendium Hungaricum", p2s: "min. IELTS 6.0 · full scholarship", p3: "Top university in Korea · GKS", p3s: "min. IELTS 6.5 · essays and interviews decide",
    pills: { no: "not eligible", real: "realistic", amb: "ambitious", high: "high fit", backup: "safe backup" },
  },
  fit: {
    eyebrow: "HONEST ASSESSMENT", titlePre: "Three assessments instead of one ", titleAccent: "number", titlePost: ".",
    text: "Average scores of admitted students can't tell whether you will get in. So we show reasons, requirements and what isn't assessed yet. Hover over the cards.",
    cards: [
      { title: "Profile Strength", text: "How strong your profile is on its own." },
      { title: "Admission Fit", text: "How well you fit a specific program — requirements, portfolio, essays, competition." },
      { title: "Funding Fit", text: "Whether funding is realistic. Separate from admission." },
    ],
  },
  path: {
    eyebrow: "YOUR PATH", titlePre: "From grade 9 to your ", titleAccent: "offer letter",
    steps: [
      { title: "Grade 9 · start", text: "Profile, Profile Strength, first goals and a roadmap." },
      { title: "Grade 10 · tests", text: "SAT and IELTS mocks, lessons on weak topics, the official exam." },
      { title: "Summer · activities", text: "Events, olympiads, a project. QR check-in goes straight to your portfolio." },
      { title: "Grade 11 · essays", text: "Essays with AI feedback, recommendations, a portfolio website." },
      { title: "Applications sent", text: "Checklists for every university and reminders before deadlines." },
    ],
  },
  features: {
    eyebrow: "ALL IN ONE PLACE", titlePre: "Tools that ", titleAccent: "do", titlePost: " the work for you.",
    mocks: { title: "SAT and IELTS mocks", text: "Questions are drawn from the bank anew for every attempt. In hard mode, leaving the tab ends the attempt.", light: "Light", hard: "Hard", lightTag: "Light mode", hardTag: "Hard mode", progress: "SAT Math · module 2 · question 14 / 22", lightNote: "Hints available · review after each answer", hardNote: "Left the tab — attempt stopped, no score" },
    advisor: { title: "AI Advisor", text: "Answers with your profile in mind. Deadlines only with a link to the official website.", q: "Is IELTS 6.5 enough for GKS?", a: "Check your program's requirements: the minimum differs. Link to the official website below." },
    roadmap: { title: "Roadmap", text: "A month-by-month plan and reminders.", checks: ["SAT mock, hard mode", "Sign up for a hackathon", "Essay draft", "Ask for a recommendation"] },
    events: { title: "One-click events", text: "QR check-in goes to your portfolio marked “verified”.", event: "Hackathon for school students", ticket: "Ticket · you're registered" },
    lessons: { title: "Lessons", text: "Short lessons from students who won scholarships. After a mock — on your weak topics.", lesson: "Advanced Math: vertex and Vieta", of: "lesson 2 of 4" },
    portfolio: { title: "A portfolio website in a minute", text: "A page built from your profile — attach the link to your application. Contacts and grades stay hidden until you open them.", bio: "Computer Science · olympiad · volunteer" },
    local: { title: "Uzbek universities too", text: "Private universities and branches of foreign universities. Often the best backup a family can afford without a scholarship.", tags: ["Tashkent", "Samarkand", "Branches", "Safe backup"] },
  },
  pricing: {
    eyebrow: "PRICING", titlePre: "Cheaper than one hour with a ", titleAccent: "consultant", popular: "popular",
    plans: [
      { name: "Free", amt: "0 UZS", items: ["Profile and Profile Strength", "3 programs in your list", "1 SAT mock per month", "Events feed"], cta: "Start" },
      { name: "Pro", amt: "120,000 UZS", per: "per month", items: ["Admission Fit and Funding Fit", "Unlimited mocks and hard mode", "30 essay checks", "All lessons"], cta: "Try Pro" },
      { name: "Season", amt: "550,000 UZS", per: "for 6 months", items: ["Everything in Pro for the season", "A mentor consultation"], cta: "Choose" },
      { name: "Schools", amt: "from 30,000 UZS", per: "per student per month", items: ["Counselor dashboard", "Class mocks in hard mode", "Admission reports"], cta: "Contact us" },
    ],
  },
  faq: {
    title: "FAQ",
    items: [
      { q: "Does this replace a consultant?", a: "For most steps, yes: program matching, the plan, essay checks, mock tests. Consultations with mentors — students who won scholarships — are coming in the Season plan." },
      { q: "Why no percentage chance?", a: "Average scores of admitted students don't give a personal probability. We show how well you fit programs and scholarships, why, and what isn't assessed yet." },
      { q: "Where do requirements and deadlines come from?", a: "From official university and scholarship websites. Until an expert reviews them, they are marked “estimated” — check dates and amounts via the official link." },
      { q: "How accurate is the mock score?", a: "It's an estimated range, not an official score. Before the exam we also recommend official practice tests." },
    ],
  },
  cta: {
    titlePre: "Where do you ", titleAccent: "want", titlePost: " to study?",
    countries: [{ id: "KR", label: "Korea" }, { id: "HU", label: "Hungary" }, { id: "US", label: "USA" }, { id: "DE", label: "Germany" }, { id: "TR", label: "Türkiye" }, { id: "UZ", label: "Uzbekistan" }],
    go: "Find out in 3 minutes →", goFor: "Match programs: {c} →", note: "Free. Sign-up is only needed to save your plan.",
  },
  footer: { tagline: "Your guide to studying abroad and at private universities in Uzbekistan.", product: "Product", partners: "Partners", schools: "Schools", unis: "Universities", organizers: "Organizers", demo: "Demo", investors: "For investors" },
};

export const LANDING: Record<Lang, LandingDict> = { ru, uz, en };
