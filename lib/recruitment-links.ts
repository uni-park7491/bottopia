export function parseIntroLinks(value:unknown):string[]|null{
 if(!Array.isArray(value)||!value.length||value.length>5)return null;
 const links:string[]=[];
 for(const v of value){if(typeof v!=='string'||v.trim().length>500)return null;const link=v.trim();if(!link)continue;try{const u=new URL(link);if(u.protocol!=='https:'||u.username||u.password)return null;}catch{return null;}if(!links.includes(link))links.push(link);}
 return links.length?links:null;
}
