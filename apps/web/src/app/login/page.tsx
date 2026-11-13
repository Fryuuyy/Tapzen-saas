"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Locale } from "@/lib/i18n";

type PhoneResult = { token?: string; user?: { id: string; phone: string; name: string }; registrationRequired?: boolean; verificationToken?: string };
type LegacyResult = { token: string; user: { id: string; phone?: string | null; name: string } };

export default function Login() {
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "legacy" | "link-code">("phone");
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyPassword, setLegacyPassword] = useState("");
  const [legacyToken, setLegacyToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState<Locale>("ru");
  const router = useRouter();

  const copy = {
    ru: { title: "Вход в TAPZEN", subtitle: "Введите номер телефона — отправим SMS с кодом подтверждения.", phone: "Номер телефона", send: "Получить код", code: "Код из SMS", verify: "Подтвердить и войти", resend: "Отправить код повторно", legacy: "Старый аккаунт? Войти по email", back: "Назад", email: "Email", password: "Пароль", link: "Подтвердить номер и привязать к аккаунту", noAccount: "Нет аккаунта?", register: "Создать аккаунт", sending: "Отправляем…", checking: "Проверяем…", invalid: "Проверьте номер и попробуйте снова.", network: "Не удалось связаться с сервером. Проверьте интернет." },
    kk: { title: "TAPZEN жүйесіне кіру", subtitle: "Телефон нөмірін енгізіңіз — SMS арқылы растау кодын жібереміз.", phone: "Телефон нөмірі", send: "Код алу", code: "SMS коды", verify: "Растау және кіру", resend: "Кодты қайта жіберу", legacy: "Ескі аккаунт па? Email арқылы кіру", back: "Артқа", email: "Email", password: "Құпиясөз", link: "Нөмірді растау және аккаунтқа байланыстыру", noAccount: "Аккаунтыңыз жоқ па?", register: "Аккаунт жасау", sending: "Жіберілуде…", checking: "Тексерілуде…", invalid: "Нөмірді тексеріп, қайталап көріңіз.", network: "Серверге қосылу мүмкін болмады. Интернетті тексеріңіз." },
    en: { title: "Sign in to TAPZEN", subtitle: "Enter your phone number and we'll text you a verification code.", phone: "Phone number", send: "Send code", code: "SMS code", verify: "Verify and sign in", resend: "Resend code", legacy: "Existing account? Sign in with email", back: "Back", email: "Email", password: "Password", link: "Verify phone and link account", noAccount: "No account yet?", register: "Create account", sending: "Sending…", checking: "Verifying…", invalid: "Check the phone number and try again.", network: "Could not reach the server. Check your connection." }
  }[locale];

  async function sendCode() {
    setBusy(true); setError("");
    try {
      await api("/api/auth/phone/send", { method: "POST", body: JSON.stringify({ phone: phone.trim() }) });
      setStep("code");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(code === "SMS_PROVIDER_NOT_CONFIGURED" ? "SMS-провайдер ещё не настроен на сервере." : code === "OTP_RATE_LIMITED" ? "Слишком много запросов. Подождите 10 минут." : copy.invalid);
    } finally { setBusy(false); }
  }

  async function verifyCode() {
    setBusy(true); setError("");
    try {
      const result = await api<PhoneResult>("/api/auth/phone/verify", { method: "POST", body: JSON.stringify({ phone: phone.trim(), code: code.trim() }) });
      if (result.registrationRequired && result.verificationToken) {
        sessionStorage.setItem("tapzen_phone_proof", result.verificationToken);
        sessionStorage.setItem("tapzen_verified_phone", phone.trim());
        router.push("/register?verified=1");
        return;
      }
      if (!result.token) throw new Error("PHONE_LOGIN_FAILED");
      localStorage.setItem("tapzen_token", result.token);
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message === "INVALID_OR_EXPIRED_CODE" ? "Неверный или просроченный код." : message === "PHONE_VERIFICATION_EXPIRED" ? "Срок действия кода истёк. Запросите новый." : copy.invalid);
    } finally { setBusy(false); }
  }

  async function legacyLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api<LegacyResult>("/api/auth/login", { method: "POST", body: JSON.stringify({ email: legacyEmail.trim(), password: legacyPassword }) });
      localStorage.setItem("tapzen_token", result.token);
      setLegacyToken(result.token);
      if (result.user.phone) { router.replace("/dashboard"); return; }
      setStep("link-code");
      await api("/api/auth/phone/send", { method: "POST", body: JSON.stringify({ phone: phone.trim() }) });
    } catch {
      setError("Не удалось войти или отправить SMS. Проверьте данные и номер.");
    } finally { setBusy(false); }
  }

  async function linkPhone() {
    setBusy(true); setError("");
    try {
      const proof = await api<{ verified: boolean; verificationToken: string }>("/api/auth/phone/verify", { method: "POST", body: JSON.stringify({ phone: phone.trim(), code: code.trim() }) });
      if (!proof.verificationToken) throw new Error("PHONE_LINK_VERIFICATION_FAILED");
      await api("/api/auth/phone/link", { method: "POST", body: JSON.stringify({ verificationToken: proof.verificationToken }) });
      router.replace("/dashboard");
    } catch {
      setError("Не удалось подтвердить и привязать номер. Проверьте код.");
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
        <h1 className="mt-8 text-3xl font-bold">{copy.title}</h1>
        <p className="muted mt-2">{copy.subtitle}</p>

        {step === "legacy" ? (
          <form className="mt-6" onSubmit={legacyLogin}>
            <label className="block text-sm">{copy.email}<input className="field mt-2" type="email" value={legacyEmail} onChange={e => setLegacyEmail(e.target.value)} autoComplete="username" required /></label>
            <label className="mt-4 block text-sm">{copy.password}<input className="field mt-2" type="password" value={legacyPassword} onChange={e => setLegacyPassword(e.target.value)} autoComplete="current-password" required /></label>
            <label className="mt-4 block text-sm">{copy.phone}<input className="field mt-2" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+77001234567" autoComplete="tel" required /></label>
            <button disabled={busy} className="btn mt-6 w-full disabled:opacity-60">{busy ? copy.checking : "Войти и привязать номер"}</button>
            <button type="button" onClick={() => setStep("phone")} className="muted mt-4 w-full text-sm">{copy.back}</button>
          </form>
        ) : (
          <div className="mt-6">
            {step === "phone" && <>
              <label className="block text-sm">{copy.phone}<input className="field mt-2" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+77001234567" autoComplete="tel" maxLength={16} required /></label>
              <button disabled={busy || phone.trim().length < 9} onClick={sendCode} className="btn mt-6 w-full disabled:opacity-60">{busy ? copy.sending : copy.send}</button>
            </>}
            {(step === "code" || step === "link-code") && <>
              <p className="muted text-sm">Код отправлен на {phone}</p>
              <label className="mt-4 block text-sm">{copy.code}<input className="field mt-2 text-center text-xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} /></label>
              <button disabled={busy || code.length < 4} onClick={step === "link-code" ? linkPhone : verifyCode} className="btn mt-6 w-full disabled:opacity-60">{busy ? copy.checking : step === "link-code" ? copy.link : copy.verify}</button>
              <button disabled={busy} onClick={sendCode} className="muted mt-4 w-full text-sm">{copy.resend}</button>
              <button onClick={() => { setStep("phone"); setCode(""); }} className="muted mt-3 w-full text-sm">{copy.back}</button>
            </>}
          </div>
        )}
        {error && <p role="alert" aria-live="polite" className="mt-4 rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}
        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <button onClick={() => { setError(""); setStep(step === "legacy" ? "phone" : "legacy"); }} className="lime text-sm">{copy.legacy}</button>
          <p className="muted mt-4 text-sm">{copy.noAccount} <Link className="lime" href="/register">{copy.register}</Link></p>
        </div>
      </section>
    </main>
  );
}
