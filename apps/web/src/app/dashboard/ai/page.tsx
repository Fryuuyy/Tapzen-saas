"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBase, getToken } from "@/lib/api";

type Message={role:"user"|"assistant";content:string};
export default function AiWorkspace(){
 const [messages,setMessages]=useState<Message[]>([]);
 const [prompt,setPrompt]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [pdfResult,setPdfResult]=useState("");
 const [insights,setInsights]=useState("");
 const [period,setPeriod]=useState<"day"|"week"|"month">("week");
 const fileRef=useRef<HTMLInputElement>(null);
 const router=useRouter();
 async function send(){
  const text=prompt.trim(); if(!text||busy)return;
  const next=[...messages,{role:"user" as const,content:text}];
  setMessages(next);setPrompt("");setBusy(true);setError("");
  try{
   const token=getToken(); if(!token){router.replace("/login");return;}
   const r=await fetch(`${apiBase}/api/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({messages:next})});
   const d=await r.json(); if(!r.ok)throw new Error(d.message||d.error||"AI_REQUEST_FAILED");
   setMessages([...next,{role:"assistant",content:d.answer}]);
  }catch(e){setError(e instanceof Error?e.message:"Не удалось отправить запрос");}
  finally{setBusy(false);}
 }
 async function analyzeBusiness(){
  setBusy(true);setError("");setInsights("");
  try{
   const token=getToken();if(!token){router.replace("/login");return;}
   const r=await fetch(`${apiBase}/api/ai/business-insights`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({period})});
   const d=await r.json();if(!r.ok)throw new Error(d.message||d.error||"AI_INSIGHTS_FAILED");
   setInsights(d.answer);
  }catch(e){setError(e instanceof Error?e.message:"Не удалось проанализировать аналитику");}
  finally{setBusy(false);}
 }
 async function analyzePdf(){
  if(!file||busy)return;
  setBusy(true);setError("");setPdfResult("");
  try{
   const token=getToken();if(!token){router.replace("/login");return;}
   const form=new FormData();form.append("file",file);
   const r=await fetch(`${apiBase}/api/ai/pdf/analyze`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form});
   const d=await r.json();if(!r.ok)throw new Error(d.message||d.error||"PDF_ANALYSIS_FAILED");
   setPdfResult(d.answer);
  }catch(e){setError(e instanceof Error?e.message:"Не удалось проанализировать PDF");}
  finally{setBusy(false);}
 }
 return <main className="min-h-screen p-5 md:p-10"><div className="mx-auto max-w-5xl"><a href="/dashboard" className="muted text-sm">← Назад в Dashboard</a><header className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm lime">TAPZEN INTELLIGENCE</div><h1 className="mt-1 text-3xl font-bold">AI-помощник</h1><p className="muted mt-2">Чат и анализ PDF на базе Coarena AI</p></div><span className="rounded-full border border-white/10 px-3 py-2 text-xs muted">Gemini 4 Argon</span></header>
 <section className="surface mt-8 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">AI-анализ бизнеса</h2><p className="muted mt-1 text-sm">Анализирует агрегированные сканирования и обратную связь вашей организации.</p></div><div className="flex gap-2"><select className="field" value={period} onChange={e=>setPeriod(e.target.value as "day"|"week"|"month")}><option value="day">Сегодня</option><option value="week">7 дней</option><option value="month">Месяц</option></select><button className="btn" disabled={busy} onClick={()=>void analyzeBusiness()}>Получить анализ</button></div></div>{insights&&<div className="mt-5 whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm leading-7">{insights}</div>}</section>
 <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><section className="surface flex min-h-[560px] flex-col p-4 md:p-6"><h2 className="text-lg font-semibold">Диалог</h2><div className="mt-4 flex-1 space-y-3 overflow-y-auto">{messages.length===0&&<div className="muted py-16 text-center">Задайте вопрос о продажах, клиентах, маркетинге или управлении бизнесом.</div>}{messages.map((m,i)=><div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-6 ${m.role==="user"?"ml-auto bg-lime-400/10":"bg-white/5"}`}><div className="mb-1 text-xs lime">{m.role==="user"?"Вы":"TAPZEN AI"}</div>{m.content}</div>)}{busy&&<div className="muted text-sm">AI обрабатывает запрос…</div>}</div><div className="mt-4 flex gap-2"><textarea className="field min-h-14 flex-1 resize-y" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Напишите сообщение…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}}/><button className="btn self-end" disabled={busy||!prompt.trim()} onClick={()=>void send()}>Отправить</button></div></section>
 <aside className="surface h-fit p-5"><h2 className="text-lg font-semibold">Анализ PDF</h2><p className="muted mt-2 text-sm">Загрузите PDF с текстовым слоем. Лимит файла — 10 МБ.</p><input ref={fileRef} className="mt-5 block w-full text-sm" type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file&&<p className="muted mt-2 break-all text-xs">{file.name}</p>}<button className="btn mt-4 w-full" disabled={!file||busy} onClick={()=>void analyzePdf()}>Анализировать документ</button>{pdfResult&&<div className="mt-5 max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm leading-6">{pdfResult}</div>}</aside></div>{error&&<div className="mt-5 rounded-xl border border-red-500/30 p-4 text-sm text-red-300">{error}</div>}<p className="muted mt-6 text-xs leading-5">Не загружайте пароли, API-ключи, банковские реквизиты, удостоверения личности или другие конфиденциальные данные. Coarena сохраняет запросы и ответы Model API и может использовать их в лицензируемых наборах данных. Не отправляйте сюда конфиденциальные документы. Для использования API владелец аккаунта должен лично принять условия Coarena и подтвердить это в серверной конфигурации.</p></div></main>;
}
