"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { messages, Locale } from "@/lib/i18n";

const loginErrors: Record<string, Record<Locale, string>> = {
  INVALID_CREDENTIALS: { ru: "Неверный email или пароль.", kk: "Email немесе құпиясөз қате.", en: "Incorrect email or password." },
  SERVER_AUTH_CONFIGURATION_ERROR: { ru: "Сервис авторизации временно недоступен. Повторите попытку позже.", kk: "Авторизация қызметі уақытша қолжетімсіз. Кейінірек қайталаңыз.", en: "Authentication is temporarily unavailable. Please try again later." },
  VALIDATION_ERROR: { ru: "Проверьте корректность email и пароля.", kk: "Email мен құпиясөздің дұрыстығын тексеріңіз.", en: "Please check your email and password." },
  LOGIN_FAILED: { ru: "Не удалось выполнить вход. Попробуйте ещё раз.", kk: "Кіру орындалмады. Қайталап көріңіз.", en: "Sign-in failed. Please try again." }
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState<Locale>("ru");
  const router = useRouter();
  const t = messages[locale];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password })
      });
      localStorage.setItem("tapzen_token", result.token);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof TypeError) {
        setError(locale === "kk" ? "Сервермен байланысу мүмкін болмады. Интернетті тексеріп, қайталап көріңіз." : locale === "en" ? "Unable to reach TAPZEN. Check your connection and try again." : "Не удалось связаться с TAPZEN. Проверьте подключение и попробуйте ещё раз.");
      } else {
        const code = err instanceof Error ? err.message : "LOGIN_FAILED";
        setError(loginErrors[code]?.[locale] || loginErrors.LOGIN_FAILED[locale]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="surface w-full max-w-md p-8" aria-busy={busy}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-2xl font-black">TAPZEN<span className="lime">.</span></Link>
          <label className="sr-only" htmlFor="login-locale">Language</label>
          <select id="login-locale" className="field w-auto" value={locale} onChange={event => setLocale(event.target.value as Locale)} aria-label="Language">
            <option value="kk">Қазақша</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>
        <h1 className="mt-8 text-3xl font-bold">{locale === "kk" ? "Қош келдіңіз!" : locale === "en" ? "Welcome back" : "С возвращением"}</h1>
        <p className="muted mt-2">{locale === "kk" ? "Бизнесіңіздің жұмыс кеңістігіне кіріңіз." : locale === "en" ? "Sign in to your business workspace." : "Войдите в рабочее пространство вашего бизнеса."}</p>
        <label className="mt-7 block text-sm" htmlFor="login-email">{t.email}
          <input id="login-email" className="field mt-2" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" maxLength={254} required />
        </label>
        <label className="mt-4 block text-sm" htmlFor="login-password">{t.password}
          <input id="login-password" className="field mt-2" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" maxLength={128} required />
        </label>
        {error && <p role="alert" aria-live="polite" className="mt-4 rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="btn mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60">{busy ? (locale === "kk" ? "Кіру..." : locale === "en" ? "Signing in…" : "Входим…") : t.login}</button>
        <p className="muted mt-5 text-center text-sm">{locale === "kk" ? "Аккаунтыңыз жоқ па?" : locale === "en" ? "No account yet?" : "Нет аккаунта?"} <Link className="lime" href="/register">{locale === "kk" ? "Аккаунт жасау" : locale === "en" ? "Create account" : "Создать аккаунт"}</Link></p>
      </form>
    </main>
  );
}
