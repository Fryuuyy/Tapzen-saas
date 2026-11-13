"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Locale } from "@/lib/i18n";

type RegisterResponse = { token: string; user: { id: string; phone: string; name: string }; organization: { id: string; name: string; slug: string } };

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "details">("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState<Locale>("ru");

  useEffect(() => {
    const proof = sessionStorage.getItem("tapzen_phone_proof");
    const verifiedPhone = sessionStorage.getItem("tapzen_verified_phone");
    if (proof && verifiedPhone) {
      setVerificationToken(proof);
      setPhone(verifiedPhone);
      setStep("details");
    }
  }, []);

  const labels = {
    ru: { title: "Создать аккаунт", subtitle: "Подтвердите номер телефона и создайте рабочее пространство TAPZEN.", name: "Ваше имя", phone: "Номер телефона", code: "Код из SMS", business: "Название бизнеса", send: "Получить SMS-код", verify: "Подтвердить номер", create: "Создать аккаунт", have: "Уже есть аккаунт?", login: "Войти", busy: "Подождите…", invalid: "Проверьте номер или код и попробуйте ещё раз." },
    kk: { title: "Аккаунт жасау", subtitle: "Телефон нөмірін растап, TAPZEN жұмыс кеңістігін жасаңыз.", name: "Атыңыз", phone: "Телефон нөмірі", code: "SMS коды", business: "Бизнес атауы", send: "SMS кодын алу", verify: "Нөмірді растау", create: "Аккаунт жасау", have: "Аккаунтыңыз бар ма?", login: "Кіру", busy: "Күтіңіз…", invalid: "Нөмірді немесе кодты тексеріп, қайталап көріңіз." },
    en: { title: "Create your account", subtitle: "Verify your phone number and create your TAPZEN workspace.", name: "Your name", phone: "Phone number", code: "SMS code", business: "Business name", send: "Send SMS code", verify: "Verify phone", create: "Create account", have: "Already have an account?", login: "Sign in", busy: "Please wait…", invalid: "Check your phone number or code and try again." }
  }[locale];

  async function sendCode() {
    setBusy(true); setError("");
    try {
      await api("/api/auth/phone/send", { method: "POST", body: JSON.stringify({ phone: phone.trim() }) });
      setStep("code");
    } catch (err) {
      setError(err instanceof Error && err.message === "SMS_PROVIDER_NOT_CONFIGURED" ? "SMS-провайдер ещё не настроен на сервере." : labels.invalid);
    } finally { setBusy(false); }
  }

  async function verifyCode() {
    setBusy(true); setError("");
    try {
      const result = await api<{ verified: boolean; registrationRequired: boolean; verificationToken?: string; token?: string }>("/api/auth/phone/verify", {
        method: "POST", body: JSON.stringify({ phone: phone.trim(), code: code.trim() })
      });
      if (result.token) {
        localStorage.setItem("tapzen_token", result.token);
        router.replace("/dashboard");
        return;
      }
      if (!result.verificationToken) throw new Error("PHONE_VERIFICATION_FAILED");
      setVerificationToken(result.verificationToken);
      setStep("details");
    } catch {
      setError(labels.invalid);
    } finally { setBusy(false); }
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verificationToken) { setError("Сначала подтвердите номер телефона."); setStep("phone"); return; }
    setBusy(true); setError("");
    try {
      const result = await api<RegisterResponse>("/api/auth/phone/register", {
        method: "POST",
        body: JSON.stringify({ verificationToken, name: name.trim(), ...(organizationName.trim() ? { organizationName: organizationName.trim() } : {}) })
      });
      sessionStorage.removeItem("tapzen_phone_proof");
      sessionStorage.removeItem("tapzen_verified_phone");
      localStorage.setItem("tapzen_token", result.token);
      router.replace("/dashboard");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(code === "PHONE_ALREADY_REGISTERED" ? "Этот номер уже зарегистрирован. Войдите в аккаунт." : code === "PHONE_VERIFICATION_EXPIRED" ? "Срок подтверждения истёк. Запросите новый SMS-код." : labels.invalid);
    } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="surface w-full max-w-md p-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-2xl font-black">TAPZEN<span className="lime">.</span></Link>
          <select className="field w-auto" value={locale} onChange={e => setLocale(e.target.value as Locale)} aria-label="Language">
            <option value="kk">Қазақша</option><option value="ru">Русский</option><option value="en">English</option>
          </select>
        </div>
        <h1 className="mt-8 text-3xl font-bold">{labels.title}</h1>
        <p className="muted mt-2">{labels.subtitle}</p>

        {step === "phone" && <div className="mt-6">
          <label className="block text-sm">{labels.phone}<input className="field mt-2" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+77001234567" autoComplete="tel" maxLength={16} /></label>
          <button disabled={busy || phone.trim().length < 9} onClick={sendCode} className="btn mt-6 w-full disabled:opacity-60">{busy ? labels.busy : labels.send}</button>
        </div>}

        {step === "code" && <div className="mt-6">
          <p className="muted text-sm">SMS отправлено на {phone}</p>
          <label className="mt-4 block text-sm">{labels.code}<input className="field mt-2 text-center text-xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} /></label>
          <button disabled={busy || code.length < 4} onClick={verifyCode} className="btn mt-6 w-full disabled:opacity-60">{busy ? labels.busy : labels.verify}</button>
          <button onClick={() => setStep("phone")} className="muted mt-4 w-full text-sm">Изменить номер</button>
        </div>}

        {step === "details" && <form className="mt-6" onSubmit={createAccount}>
          <p className="mb-4 rounded-lg border border-white/10 p-3 text-sm text-green-300">✓ Номер {phone} подтверждён</p>
          <label className="block text-sm">{labels.name}<input className="field mt-2" value={name} onChange={e => setName(e.target.value)} autoComplete="name" minLength={2} maxLength={100} required /></label>
          <label className="mt-4 block text-sm">{labels.business}<input className="field mt-2" value={organizationName} onChange={e => setOrganizationName(e.target.value)} minLength={2} maxLength={120} placeholder="Например, STEPPE Coffee" /></label>
          <button disabled={busy} className="btn mt-6 w-full disabled:opacity-60">{busy ? labels.busy : labels.create}</button>
        </form>}

        {error && <p role="alert" aria-live="polite" className="mt-4 rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}
        <p className="muted mt-6 text-center text-sm">{labels.have} <Link className="lime" href="/login">{labels.login}</Link></p>
      </section>
    </main>
  );
}
