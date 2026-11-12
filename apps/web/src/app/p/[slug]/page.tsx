import Link from "next/link";
type Profile = { title:string; description?:string|null; locale:string; links:Array<{label:string;url:string}>; whatsapp?:string|null; instagram?:string|null; telegram?:string|null; twogis?:string|null; menuUrl?:string|null; organization:{name:string}; branch?:{name:string;address?:string|null}|null };
async function getProfile(slug:string):Promise<Profile|null>{
 const api=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
 try { const r=await fetch(`${api}/api/profiles/public/${encodeURIComponent(slug)}`,{cache:"no-store"}); if(!r.ok)return null; const d=await r.json(); return d.profile as Profile; } catch { return null; }
}
export default async function PublicProfile({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const p=await getProfile(slug);
 if(!p)return <main className="flex min-h-screen items-center justify-center p-6"><div className="surface max-w-md p-8 text-center"><h1 className="text-2xl font-bold">Профиль недоступен</h1><p className="muted mt-3">Ссылка может быть неверной или профиль отключён.</p><Link href="/" className="btn mt-6 inline-flex">TAPZEN</Link></div></main>;
 const links=[...(p.links||[]),...([["WhatsApp",p.whatsapp],["Instagram",p.instagram],["Telegram",p.telegram],["2GIS",p.twogis],["Меню",p.menuUrl]] as Array<[string,string|null|undefined]>).filter(x=>x[1]).map(([label,url])=>({label,url:url!}))];
 return <main className="min-h-screen px-5 py-12"><section className="surface mx-auto max-w-lg p-7 text-center"><div className="text-2xl font-black">TAPZEN<span className="lime">.</span></div><h1 className="mt-8 text-3xl font-bold">{p.title}</h1><p className="muted mt-2">{p.organization.name}{p.branch?.name?` · ${p.branch.name}`:""}</p>{p.description&&<p className="mt-5 text-sm leading-6">{p.description}</p>}<div className="mt-8 grid gap-3">{links.map((l,i)=><a key={`${l.label}-${i}`} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-secondary block w-full">{l.label}</a>)}</div>{p.branch?.address&&<p className="muted mt-7 text-sm">{p.branch.address}</p>}</section></main>;
}
