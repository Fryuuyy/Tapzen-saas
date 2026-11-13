"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { messages, Locale } from "@/lib/i18n";

type RegisterResponse = { token: string; user: { id: string; email: string; name: string }; organization: { id: string; name: string; slug: string } };

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState<Locale>("ru");
  const t = messages[locale];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (busy) return;
    setBusy(true);
    try {
      const result = await api<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, ...(organizationName.trim() ? { organizationName: organizationName.trim() } : {}) })
      });
      localStorage.setItem("tapzen_token", result.token);
      router.replace("/dashboard");
    } catch (err) {
      const code = err instanceof Error ? err.message : "REGISTRATION_FAILED";
      if (err instanceof TypeError) {
        setError(locale === "kk" ? "TAPZEN серверіне қосылу мүмкін болмады. Интернетті тексеріп, қайталап көріңіз." : locale === "en" ? "Unable to reach TAPZEN. Check your connection and try again." : "Не удалось связаться с TAPZEN. Проверьте подключение и попробуйте ещё раз.");
        return;
      }
      const errorMessages: Record<string, Record<Locale, string>> = {
        EMAIL_ALREADY_REGISTERED: { ru: "Этот email уже зарегистрирован. Войдите в аккаунт.", kk: "Бұл email бұрын тіркелген. Аккаунтыңызға кіріңіз.", en: "This email is already registered. Please sign in." },
        EMAIL_OR_ORGANIZATION_ALREADY_EXISTS: { ru: "Этот email уже зарегистрирован или название рабочего пространства занято. Проверьте данные.", kk: "Бұл email тіркелген немесе жұмыс кеңістігінің атауы бос емес. Деректерді тексеріңіз.", en: "This email or workspace name is already in use. Please check your details." },
        SERVER_AUTH_CONFIGURATION_ERROR: { ru: "Сервис авторизации временно недоступен. Попробуйте позже.", kk: "Авторизация қызметі уақытша қолжетімсіз. Кейінірек қайталаңыз.", en: "Authentication is temporarily unavailable. Please try again later." },
        VALIDATION_ERROR: { ru: "Проверьте имя, email и пароль (минимум 10 символов).", kk: "Атыңызды, email және құпиясөзді тексеріңіз (кемінде 10 таңба).", en: "Check your name, email and password (at least 10 characters)." },
        REGISTRATION_FAILED: { ru: "Не удалось создать аккаунт. Попробуйте позже или обратитесь в поддержку.", kk: "Аккаунт жасау мүмкін болмады. Кейінірек қайталаңыз немесе қолдау қызметіне хабарласыңыз.", en: "Could not create your account. Please try again later or contact support." }
      };
      setError(errorMessages[code]?.[locale] || errorMessages.REGISTRATION_FAILED[locale]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="surface w-full max-w-md p-8">
        <div className="flex items-center justify-between gap-3"><Link href="/" className="text-2xl font-black">TAPZEN<span className="lime">.</span></Link><select className="field w-auto" value={locale} onChange={e=>setLocale(e.target.value as Locale)} aria-label="Language"><option value="kk">Қазақша</option><option value="ru">Русский</option><option value="en">English</option></select></div>
        <h1 className="mt-8 text-3xl font-bold">{locale === "kk" ? "Аккаунт жасау" : locale === "en" ? "Create your account" : "Создать аккаунт"}</h1>
        <p className="muted mt-2">{locale === "kk" ? "Бизнесіңізді тіркеп, TAPZEN жұмыс кеңістігін ашыңыз." : locale === "en" ? "Register your business and open your TAPZEN workspace." : "Зарегистрируйте бизнес и откройте рабочее пространство TAPZEN."}</p>
        <label className="mt-6 block text-sm">{locale === "kk" ? "Аты-жөніңіз" : locale === "en" ? "Your name" : "Ваше имя"}
          <input className="field mt-2" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" minLength={2} maxLength={100} required />
        </label>
        <label className="mt-4 block text-sm">Email
          <input className="field mt-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" maxLength={254} required />
        </label>
        <label className="mt-4 block text-sm">{locale === "kk" ? "Бизнес атауы" : locale === "en" ? "Business name" : "Название бизнеса"}
          <input className="field mt-2" value={organizationName} onChange={e=>setOrganizationName(e.target.value)} minLength={2} maxLength={120} placeholder="Например, STEPPE Coffee" />
        </label>
        <label className="mt-4 block text-sm">{locale === "kk" ? "Құпиясөз" : locale === "en" ? "Password" : "Пароль"}
          <input className="field mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required />
          <span className="muted mt-1 block text-xs">{locale === "kk" ? "Кемінде 10 таңба." : locale === "en" ? "At least 10 characters." : "Минимум 10 символов."}</span>
        </label>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="btn mt-6 w-full disabled:opacity-60">{busy ? (locale === "kk" ? "Аккаунт жасалуда…" : locale === "en" ? "Creating account…" : "Создаём аккаунт…") : (locale === "kk" ? "Аккаунт жасау" : locale === "en" ? "Create account" : "Создать аккаунт")}</button>
        <p className="muted mt-5 text-center text-sm">{locale === "kk" ? "Аккаунтыңыз бар ма?" : locale === "en" ? "Already have an account?" : "Уже есть аккаунт?"} <Link className="lime" href="/login">{t.login}</Link></p>
      </form>
    </main>
  );
}
