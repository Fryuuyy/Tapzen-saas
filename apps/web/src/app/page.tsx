import Link from "next/link";
export default function Home(){
 return <main className="min-h-screen px-6 py-8 md:px-16">
  <nav className="flex items-center justify-between"><div className="text-2xl font-black tracking-tight">TAPZEN<span className="lime">.</span></div><Link className="btn-secondary" href="/login">Sign in / Кіру</Link></nav>
  <section className="mx-auto grid max-w-6xl items-center gap-12 py-24 md:grid-cols-2">
   <div><div className="mb-5 inline-flex rounded-full border border-lime/30 px-3 py-1 text-xs lime">DIGITAL BUSINESS ECOSYSTEM</div>
    <h1 className="text-5xl font-black leading-tight md:text-7xl">Make your business <span className="lime">smarter.</span></h1>
    <p className="muted mt-6 max-w-lg text-lg">NFC, QR and digital tools that connect your customers with your business.</p>
    <div className="mt-8 flex gap-3"><Link href="/login" className="btn">Open dashboard</Link><a href="#features" className="btn-secondary">Explore platform</a></div>
   </div>
   <div className="surface p-6 shadow-glow"><div className="mb-6 flex justify-between"><span className="font-bold">TAPZEN / Overview</span><span className="lime text-xs">● LIVE PREVIEW</span></div>
    <div className="grid grid-cols-2 gap-3">{[["1,284","Scans"],["846","Profile visits"],["12","Active links"],["3","Branches"]].map(x=><div className="rounded-xl bg-black/40 p-5" key={x[1]}><div className="text-3xl font-bold">{x[0]}</div><div className="muted mt-1 text-sm">{x[1]}</div></div>)}</div>
    <div className="mt-5 rounded-xl border border-white/10 p-5"><div className="muted text-sm">Your business, connected</div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 w-2/3 rounded-full bg-lime"/></div></div>
   </div>
  </section>
  <section id="features" className="mx-auto grid max-w-6xl gap-4 pb-20 md:grid-cols-3">{[["01","Digital profiles","One page for contacts, social media and locations."],["02","NFC + QR","Update destinations without replacing your physical tag."],["03","Analytics","Understand how customers interact with your touchpoints."]].map(x=><div className="surface p-6" key={x[0]}><div className="lime text-sm">{x[0]}</div><h2 className="mt-4 text-xl font-bold">{x[1]}</h2><p className="muted mt-2">{x[2]}</p></div>)}</section>
  <footer className="muted border-t border-white/10 py-6 text-center text-sm">© {new Date().getFullYear()} TAPZEN. Built for businesses in Kazakhstan.</footer>
 </main>
}
