"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function FounderSetupPage(){
 const router=useRouter();
 const [setupKey,setSetupKey]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");setBusy(true);
  try{
   await api<{success:boolean;role:string}>("/api/auth/founder-bootstrap",{method:"POST",body:JSON.stringify({setupKey})});
   router.replace("/admin");
  }catch(e){
   const code=e instanceof Error?e.message:"FOUNDER_SETUP_FAILED";
   const messages:Record<string,string>={FOUNDER_EMAIL_MISMATCH:"Войдите в аккаунт maadilov@gmail.com.",INVALID_FOUNDER_SETUP_KEY:"Код активации неверный.",FOUNDER_ALREADY_CLAIMED:"Founder-доступ уже активирован для другого аккаунта.",FOUNDER_SETUP_NOT_CONFIGURED:"Активация временно не настроена.",UNAUTHORIZED:"Сначала войдите в аккаунт.",ORGANIZATION_ACCESS_DENIED:"Не найдено рабочее пространство аккаунта."};
   setError(messages[code]||"Не удалось активировать Founder-доступ: "+code);
  }finally{setBusy(false);}
 }
 return <main className="flex min-h-screen items-center justify-center px-5 py-10"><form onSubmit={submit} className="surface w-full max-w-md p-8"><a href="/" className="text-2xl font-black">TAPZEN<span className="lime">.</span></a><div className="mt-2 text-xs tracking-widest text-lime-300">FOUNDER ACTIVATION</div><h1 className="mt-8 text-3xl font-bold">Активация основателя</h1><p className="muted mt-3 text-sm">Войдите под maadilov@gmail.com и введите одноразовый код активации, полученный от администратора проекта.</p><label className="mt-6 block text-sm">Код активации<input className="field mt-2" type="password" value={setupKey} onChange={e=>setSetupKey(e.target.value)} minLength={32} autoComplete="off" required /></label>{error&&<p role="alert" className="mt-4 rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}<button disabled={busy} className="btn mt-6 w-full disabled:opacity-60">{busy?"Активируем…":"Активировать Founder-доступ"}</button></form></main>;
}
