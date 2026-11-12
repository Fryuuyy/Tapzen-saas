"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

const copy = {
  ru: {
    signIn: "Войти", badge: "ЦИФРОВАЯ ЭКОСИСТЕМА ДЛЯ БИЗНЕСА",
    titleA: "Сделайте бизнес", titleB: "умнее.",
    lead: "NFC, QR и цифровые инструменты, которые помогают клиентам взаимодействовать с вашим бизнесом.",
    start: "Открыть кабинет", explore: "Возможности",
    dashboard: "TAPZEN / Обзор", live: "ПРЕВЬЮ",
    stats: [["1 284", "Сканирования"], ["846", "Просмотры страниц"], ["12", "Активных ссылок"], ["3", "Филиала"]],
    connected: "Ваш бизнес — на связи",
    features: [["01", "Цифровые страницы", "Одна страница для контактов, социальных сетей и адресов."], ["02", "NFC и QR", "Меняйте ссылки и назначения без замены физической таблички."], ["03", "Аналитика", "Понимайте, как клиенты взаимодействуют с вашими NFC- и QR-точками."]],
    footer: "Создано для бизнеса в Казахстане."
  },
  kk: {
    signIn: "Кіру", badge: "БИЗНЕСКЕ АРНАЛҒАН ЦИФРЛЫҚ ЭКОЖҮЙЕ",
    titleA: "Бизнесіңізді", titleB: "ақылды етіңіз.",
    lead: "NFC, QR және цифрлық құралдар клиенттерге бизнесіңізбен оңай байланысуға көмектеседі.",
    start: "Жеке кабинетке өту", explore: "Мүмкіндіктер",
    dashboard: "TAPZEN / Шолу", live: "АЛДЫН АЛА КӨРУ",
    stats: [["1 284", "Сканерлеу"], ["846", "Парақша қаралымы"], ["12", "Белсенді сілтеме"], ["3", "Филиал"]],
    connected: "Бизнесіңіз әрдайым байланыста",
    features: [["01", "Цифрлық парақшалар", "Байланыс деректері, әлеуметтік желілер және мекенжайлар бір бетте."], ["02", "NFC және QR", "Физикалық тақтайшаны ауыстырмай-ақ сілтемелерді жаңартыңыз."], ["03", "Талдау", "Клиенттердің NFC және QR нүктелерімен қалай әрекеттесетінін бақылаңыз."]],
    footer: "Қазақстан бизнесі үшін жасалған."
  },
  en: {
    signIn: "Sign in", badge: "DIGITAL BUSINESS ECOSYSTEM",
    titleA: "Make your business", titleB: "smarter.",
    lead: "NFC, QR and digital tools that help customers connect with your business.",
    start: "Open dashboard", explore: "Explore features",
    dashboard: "TAPZEN / Overview", live: "LIVE PREVIEW",
    stats: [["1,284", "Scans"], ["846", "Profile visits"], ["12", "Active links"], ["3", "Branches"]],
    connected: "Your business, connected",
    features: [["01", "Digital profiles", "One page for contacts, social media and locations."], ["02", "NFC + QR", "Update destinations without replacing your physical sign."], ["03", "Analytics", "Understand how customers interact with your NFC and QR touchpoints."]],
    footer: "Built for businesses in Kazakhstan."
  }
} as const;

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ru");
  const t = copy[locale];
  return (
    <main className="min-h-screen px-6 py-8 md:px-16">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-black tracking-tight">TAPZEN<span className="lime">.</span></Link>
        <div className="flex items-center gap-3">
          <label htmlFor="home-locale" className="sr-only">Language</label>
          <select id="home-locale" className="field w-auto" value={locale} onChange={event => setLocale(event.target.value as Locale)} aria-label="Language">
            <option value="kk">Қазақша</option><option value="ru">Русский</option><option value="en">English</option>
          </select>
          <Link className="btn-secondary" href="/login">{t.signIn}</Link>
        </div>
      </nav>
      <section className="mx-auto grid max-w-6xl items-center gap-12 py-20 md:grid-cols-2 md:py-24">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-lime/30 px-3 py-1 text-xs lime">{t.badge}</div>
          <h1 className="text-5xl font-black leading-tight md:text-7xl">{t.titleA} <span className="lime">{t.titleB}</span></h1>
          <p className="muted mt-6 max-w-lg text-lg">{t.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="btn">{t.start}</Link><a href="#features" className="btn-secondary">{t.explore}</a></div>
        </div>
        <div className="surface p-6 shadow-glow">
          <div className="mb-6 flex justify-between"><span className="font-bold">{t.dashboard}</span><span className="lime text-xs">● {t.live}</span></div>
          <div className="grid grid-cols-2 gap-3">{t.stats.map(([value,label]) => <div className="rounded-xl bg-black/40 p-5" key={label}><div className="text-3xl font-bold">{value}</div><div className="muted mt-1 text-sm">{label}</div></div>)}</div>
          <div className="mt-5 rounded-xl border border-white/10 p-5"><div className="muted text-sm">{t.connected}</div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 w-2/3 rounded-full bg-lime" /></div></div>
        </div>
      </section>
      <section id="features" className="mx-auto grid max-w-6xl gap-4 pb-20 md:grid-cols-3">
        {t.features.map(([number,title,description]) => <article className="surface p-6" key={number}><div className="lime text-sm">{number}</div><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="muted mt-2">{description}</p></article>)}
      </section>
      <footer className="muted border-t border-white/10 py-6 text-center text-sm">© {new Date().getFullYear()} TAPZEN. {t.footer}</footer>
    </main>
  );
}
