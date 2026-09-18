import {getCountries,parsePhoneNumberFromString,type CountryCode} from 'libphonenumber-js';
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type Contacts={email:string;phone:string;country:string;kakao:string};
export function readContacts(record:{contacts?:Contacts|null;contact_type?:string|null;contact_value?:string|null}):Contacts{
 const base={email:'',phone:'',country:'KR',kakao:''};
 if(record.contacts)return {...base,...record.contacts};
 if(record.contact_type==='email')base.email=record.contact_value||'';
 if(record.contact_type==='phone')base.phone=record.contact_value||'';
 if(record.contact_type==='kakao')base.kakao=record.contact_value||'';
 return base;
}
export function parsePrivateDetails(value:Record<string,unknown>):{contact_type:string;contact_value:string;contacts:Contacts|null;file_ids:string[]}|null{
 if(value.contacts!==undefined){
  if(!value.contacts||typeof value.contacts!=='object'||Array.isArray(value.contacts))return null;
  const c=value.contacts as Record<string,unknown>;
  if(['email','phone','country','kakao'].some(k=>typeof c[k]!=='string'))return null;
  const contacts={email:(c.email as string).trim(),phone:(c.phone as string).trim(),country:c.country as string,kakao:(c.kakao as string).trim()};
  if(!getCountries().includes(contacts.country as CountryCode))return null;
  if(contacts.phone){
   if(!/^\+?[0-9 ()-]{7,25}$/.test(contacts.phone))return null;
   const phone=parsePhoneNumberFromString(contacts.phone,contacts.country as CountryCode);
   if(!phone?.isPossible())return null;
   contacts.phone=phone.number;
  }
  const entries=[['email',contacts.email],['phone',contacts.phone],['kakao',contacts.kakao]].filter(([,v])=>v);
  if(!entries.length)return null;
  for(const [contactType,contactValue] of entries){if(!parsePrivateDetails({contactType,contactValue,fileIds:value.fileIds}))return null;}
  return {contact_type:entries[0][0],contact_value:entries[0][1],contacts,file_ids:value.fileIds as string[]};
 }
 const type=value.contactType, contact=typeof value.contactValue==='string'?value.contactValue.trim():'';
 const files=value.fileIds;
 if(!['email','phone','kakao'].includes(String(type))||!contact||contact.length>254||/[\r\n\x00-\x1f]/.test(contact))return null;
 if(type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))return null;
 if(type==='phone'&&!/^\+?[0-9 ()-]{7,25}$/.test(contact))return null;
 if(type==='kakao'&&(contact.length>50||/\s/.test(contact)))return null;
 if(!Array.isArray(files)||files.length>3||files.some(f=>typeof f!=='string'||!uuidPattern.test(f))||new Set(files).size!==files.length)return null;
 return {contact_type:String(type),contact_value:contact,contacts:null,file_ids:files as string[]};
}
export function canReadApplication(viewer:string,owner:string,applicant:string){return viewer===owner||viewer===applicant;}
export function discloseContact(viewer:string,recordOwner:string,accepted:boolean){return viewer===recordOwner||accepted;}
export function safeIntro(value:unknown){try{if(typeof value!=='string'||value.length>500)return false;const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
