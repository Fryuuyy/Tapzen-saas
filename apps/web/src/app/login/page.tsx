"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
export default function Login(){
 const [email,setEmail]=useState("demo@tapzen.kz"),[password,setPassword]=useState("TapzenDemo2026!"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const router=useRouter();
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await api<{token:string}>("/api/auth/login",{method:"POST",body:JSON.stringify({email,password})});localStorage.setItem("tapzen_token",r.token);router.push("/dashboard")}catch(err){setError(err instanceof Error?err.message:"LOGIN_FAILED")}finally{setBusy(false)}}
 return <main className="flex min-h-screen items-center justify-center px-5"><form onSubmit={submit} className="surface w-full max-w-md p-8"><a href="/" className="text-2xl font-black">TAPZEN<span className="lime">.</span></a><h1 className="mt-8 text-3xl font-bold">Welcome back</h1><p className="muted mt-2">Sign in to your business workspace.</p><label className="mt-7 block text-sm">Email<input className="field mt-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="mt-4 block text-sm">Password<input className="field mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<p className="mt-3 text-sm text-red-400">{error}</p>}<button disabled={busy} className="btn mt-6 w-full">{busy?"Signing in…":"Sign in"}</button><p className="muted mt-4 text-xs">Local demo: demo@tapzen.kz / TapzenDemo2026!</p></form></main>
}
