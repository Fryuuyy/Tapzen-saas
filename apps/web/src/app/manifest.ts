import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return { name:"TAPZEN Business", short_name:"TAPZEN", description:"Digital Business Ecosystem", start_url:"/dashboard", display:"standalone", background_color:"#080a09", theme_color:"#080a09", icons:[] };
}
