"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

type RegisterResponse = { token: string; user: { id: string; email: string; name: string }; organization: { id: string; name: string; slug: string } };

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
      const messages: Record<string, string> = {
        EMAIL_ALREADY_REGISTERED: "Этот email уже зарегистрирован. Войдите в аккаунт.",
        VALIDATION_ERROR: "Проверьте имя, email и пароль (минимум 10 символов).",
        REGISTRATION_FAILED: "Не удалось создать аккаунт. Попробуйте позже."
      };
      setError(messages[code] || messages.REGISTRATION_FAILED);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="surface w-full max-w-md p-8">
        <Link href="/" className="text-2xl font-black">TAPZEN<span className="lime">.</span></Link>
        <h1 className="mt-8 text-3xl font-bold">Создать аккаунт</h1>
        <p className="muted mt-2">Зарегистрируйте бизнес и откройте рабочее пространство TAPZEN.</p>
        <label className="mt-6 block text-sm">Ваше имя
          <input className="field mt-2" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" minLength={2} maxLength={100} required />
        </label>
        <label className="mt-4 block text-sm">Email
          <input className="field mt-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" maxLength={254} required />
        </label>
        <label className="mt-4 block text-sm">Название бизнеса
          <input className="field mt-2" value={organizationName} onChange={e=>setOrganizationName(e.target.value)} minLength={2} maxLength={120} placeholder="Например, STEPPE Coffee" />
        </label>
        <label className="mt-4 block text-sm">Пароль
          <input className="field mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required />
          <span className="muted mt-1 block text-xs">Минимум 10 символов.</span>
        </label>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="btn mt-6 w-full disabled:opacity-60">{busy ? "Создаём аккаунт…" : "Создать аккаунт"}</button>
        <p className="muted mt-5 text-center text-sm">Уже есть аккаунт? <Link className="lime" href="/login">Войти</Link></p>
      </form>
    </main>
  );
}
