const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export function getToken(){ if(typeof window==="undefined") return null; return localStorage.getItem("tapzen_token"); }
export async function api<T>(path:string, options:RequestInit={}):Promise<T>{
 const token=getToken();
 const response=await fetch(`${API}${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})},cache:"no-store"});
 const data=await response.json().catch(()=>({error:"INVALID_RESPONSE"}));
 if(!response.ok) throw new Error(data.error || "REQUEST_FAILED");
 return data as T;
}
export const apiBase=API;
