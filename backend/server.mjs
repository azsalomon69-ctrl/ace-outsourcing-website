import http from 'node:http';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { loadContentFromDatabase, replaceContentInDatabase } from './lib/content-repository.mjs';
import { deleteStoredImage, parseImageUpload, storeImage } from './lib/media-service.mjs';
import { supabaseConfigured } from './lib/supabase.mjs';

const scrypt=promisify(scryptCallback);
const port=Number(process.env.PORT)||10000;
const production=process.env.NODE_ENV==='production';
const adminEmail=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
const adminPasswordHash=String(process.env.ADMIN_PASSWORD_HASH||'');
const sessionSecret=String(process.env.SESSION_SECRET||'');
const frontendOrigin=String(process.env.FRONTEND_ORIGIN||'').replace(/\/$/,'');
const defaultFile=resolve('data/default-content.json');
const sessionHours=Math.max(1,Math.min(24,Number(process.env.SESSION_HOURS)||8));
const loginAttempts=new Map();
const loginEntryAttempts=new Map();
const loginEntryClicks=10;
const loginEntryWindowMs=15_000;
const loginEntryMinIntervalMs=60;
const requestedLoginEntrySeconds=Number(process.env.LOGIN_ENTRY_GRANT_SECONDS)||120;
const loginEntryGrantMs=Math.max(production?30:1,Math.min(300,requestedLoginEntrySeconds))*1000;

function assertConfiguration(){
  const missing=[];
  if(!adminEmail)missing.push('ADMIN_EMAIL');
  if(!adminPasswordHash)missing.push('ADMIN_PASSWORD_HASH');
  if(sessionSecret.length<32)missing.push('SESSION_SECRET (at least 32 characters)');
  if(production&&!frontendOrigin)missing.push('FRONTEND_ORIGIN');
  if(production&&!supabaseConfigured)missing.push('SUPABASE_URL and SUPABASE_SECRET_KEY');
  if(missing.length)throw new Error(`Missing secure configuration: ${missing.join(', ')}`);
}

function securityHeaders(response){
  response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('X-Frame-Options','DENY');
  response.setHeader('Referrer-Policy','no-referrer');
  response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  response.setHeader('Cache-Control','no-store');
}

function applyCors(request,response){
  const origin=request.headers.origin;
  const localAllowed=!production&&/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin||'');
  if(origin&&(origin===frontendOrigin||localAllowed)){
    response.setHeader('Access-Control-Allow-Origin',origin);
    response.setHeader('Vary','Origin');
    response.setHeader('Access-Control-Allow-Credentials','true');
    response.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token');
    return true;
  }
  return !origin;
}

function sendJson(response,status,data){
  const body=JSON.stringify(data);
  response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body)});
  response.end(body);
}

async function readJson(request,limit=12*1024*1024){
  const chunks=[];
  let size=0;
  for await(const chunk of request){
    size+=chunk.length;
    if(size>limit){const error=new Error('Request body is too large.');error.status=413;throw error}
    chunks.push(chunk);
  }
  if(!chunks.length)return {};
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{const error=new Error('Invalid JSON.');error.status=400;throw error}
}

function cookies(request){
  return Object.fromEntries(String(request.headers.cookie||'').split(';').map(value=>value.trim()).filter(Boolean).map(value=>{const index=value.indexOf('=');return index<0?[value,'']:[value.slice(0,index),decodeURIComponent(value.slice(index+1))]}));
}

function sign(value){return createHmac('sha256',sessionSecret).update(value).digest('base64url')}
function signedToken(data){
  const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
function verifySignedToken(token){
  const [payload,signature]=String(token||'').split('.');
  if(!payload||!signature)return null;
  const expected=Buffer.from(sign(payload));
  const actual=Buffer.from(signature);
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
  try{return JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{return null}
}
function createSession(){
  const csrf=randomBytes(24).toString('base64url');
  const payload=Buffer.from(JSON.stringify({csrf,expires:Date.now()+sessionHours*60*60*1000,nonce:randomBytes(16).toString('base64url')})).toString('base64url');
  return {token:`${payload}.${sign(payload)}`,csrf};
}
function verifySession(request){
  const token=cookies(request).ace_session;
  if(!token)return null;
  const session=verifySignedToken(token);
  return session?.csrf&&session.expires>Date.now()?session:null;
}
function sessionCookie(token,maxAge=sessionHours*60*60){
  const path=production?'/api':'/';
  return `ace_session=${encodeURIComponent(token)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production?'; Secure':''}`;
}
function temporaryCookie(name,token,maxAge){
  const path=production?'/api':'/';
  return `${name}=${encodeURIComponent(token)}; Path=${path}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production?'; Secure':''}`;
}
function requireSession(request,response,csrf=false){
  const session=verifySession(request);
  if(!session){sendJson(response,401,{error:'Authentication required.'});return null}
  if(csrf&&request.headers['x-csrf-token']!==session.csrf){sendJson(response,403,{error:'Invalid security token.'});return null}
  return session;
}

async function verifyPassword(password){
  const [scheme,saltText,hashText]=adminPasswordHash.split('$');
  if(scheme!=='scrypt'||!saltText||!hashText)return false;
  try{
    const expected=Buffer.from(hashText,'base64url');
    const actual=Buffer.from(await scrypt(String(password),Buffer.from(saltText,'base64url'),expected.length));
    return expected.length===actual.length&&timingSafeEqual(expected,actual);
  }catch{return false}
}

function clientAddress(request){return String(request.headers['x-forwarded-for']||request.socket.remoteAddress||'unknown').split(',')[0].trim()}
function requestBinding(request){
  return sign(`${clientAddress(request)}\n${String(request.headers['user-agent']||'').slice(0,512)}`);
}
function trustedLoginEntryRequest(request){
  const origin=String(request.headers.origin||'');
  const localAllowed=!production&&/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const fetchSite=String(request.headers['sec-fetch-site']||'');
  return (origin===frontendOrigin||localAllowed)&&(!fetchSite||fetchSite==='same-origin'||fetchSite==='same-site');
}
function canAttemptLoginEntry(request){
  const key=clientAddress(request),now=Date.now(),windowMs=5*60*1000;
  const record=loginEntryAttempts.get(key);
  if(!record||now-record.started>windowMs){loginEntryAttempts.set(key,{started:now,count:1});return true}
  record.count+=1;
  return record.count<=60;
}
function loginEntryAllowed(request){
  const grant=verifySignedToken(cookies(request).ace_login_access);
  return Boolean(grant?.purpose==='login-entry'&&grant.expires>Date.now()&&grant.binding===requestBinding(request));
}
function advanceLoginEntry(request,response){
  if(!trustedLoginEntryRequest(request)||!canAttemptLoginEntry(request)){sendJson(response,404,{error:'Not found.'});return}
  const now=Date.now(),binding=requestBinding(request),current=verifySignedToken(cookies(request).ace_login_clicks);
  let count=1,started=now;
  if(current?.purpose==='login-clicks'&&current.binding===binding&&current.expires>now){
    const interval=now-current.last;
    if(interval>=loginEntryMinIntervalMs&&now-current.started<=loginEntryWindowMs){count=current.count+1;started=current.started}
  }
  if(count===loginEntryClicks){
    const grant=signedToken({purpose:'login-entry',binding,expires:now+loginEntryGrantMs,nonce:randomBytes(18).toString('base64url')});
    response.setHeader('Set-Cookie',[temporaryCookie('ace_login_access',grant,Math.ceil(loginEntryGrantMs/1000)),temporaryCookie('ace_login_clicks','',0)]);
    sendJson(response,200,{unlocked:true});return;
  }
  if(count>loginEntryClicks)count=1;
  const progress=signedToken({purpose:'login-clicks',binding,count,started,last:now,expires:started+loginEntryWindowMs,nonce:randomBytes(12).toString('base64url')});
  response.setHeader('Set-Cookie',temporaryCookie('ace_login_clicks',progress,Math.ceil(loginEntryWindowMs/1000)));
  sendJson(response,200,{unlocked:false});
}
function canAttemptLogin(request){
  const key=clientAddress(request),now=Date.now(),windowMs=15*60*1000;
  const record=loginAttempts.get(key);
  if(!record||now-record.started>windowMs){loginAttempts.set(key,{started:now,count:1});return true}
  record.count+=1;
  return record.count<=5;
}
function clearAttempts(request){loginAttempts.delete(clientAddress(request))}

function normalizeContent(value){
  if(!value||typeof value!=='object'||!Array.isArray(value.team)||!Array.isArray(value.testimonials)||!Array.isArray(value.blogs)||!Array.isArray(value.jobs))throw Object.assign(new Error('Invalid content structure.'),{status:400});
  if(value.team.length>100||value.testimonials.length>100||value.blogs.length>250||value.jobs.length>250)throw Object.assign(new Error('Content collection limit exceeded.'),{status:400});
  const cleanText=(input,max=20000)=>String(input??'').slice(0,max);
  const cleanUrl=input=>{const value=cleanText(input,2048);if(/^https:\/\//i.test(value)||value.startsWith('assets/'))return value;return ''};
  const cleanHttpsUrl=input=>{const value=cleanText(input,2048).trim();return /^https:\/\/[^\s]+$/i.test(value)?value:''};
  const cleanMediaId=input=>/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(input||''))?String(input):null;
  const status=(input,allowed,fallback)=>allowed.includes(input)?input:fallback;
  return {
    team:value.team.map(item=>({id:cleanText(item.id,100),slug:cleanText(item.slug,100),name:cleanText(item.name,150),role:cleanText(item.role,150),department:cleanText(item.department,150),quote:cleanText(item.quote,2000),bio:cleanText(item.bio,10000),image:cleanUrl(item.image),imageMediaId:cleanMediaId(item.imageMediaId),status:status(item.status,['draft','published','archived'],'published'),publishedAt:cleanText(item.publishedAt,100)})),
    testimonials:value.testimonials.map(item=>{const permissionConfirmed=Boolean(item.permissionConfirmed);return {id:cleanText(item.id,100),name:cleanText(item.name,150),company:cleanText(item.company,200),quote:cleanText(item.quote,4000),logo:cleanUrl(item.logo),logoMediaId:cleanMediaId(item.logoMediaId),rating:Math.max(1,Math.min(5,Number(item.rating)||5)),status:status(item.status,['draft','published','archived'],permissionConfirmed?'published':'draft'),permissionConfirmed,permissionReference:cleanText(item.permissionReference,1000),publishedAt:cleanText(item.publishedAt,100)}}),
    blogs:value.blogs.map(item=>({id:cleanText(item.id,100),slug:cleanText(item.slug,100),title:cleanText(item.title,250),category:cleanText(item.category,100),author:cleanText(item.author,150),date:cleanText(item.date,100),publishedAt:cleanText(item.publishedAt,100),excerpt:cleanText(item.excerpt,2000),body:cleanText(item.body,50000),cover:cleanUrl(item.cover),coverMediaId:cleanMediaId(item.coverMediaId),images:Array.isArray(item.images)?item.images.slice(0,100).map(cleanUrl).filter(Boolean):[],gallery:Array.isArray(item.gallery)?item.gallery.slice(0,100).map(image=>({mediaId:cleanMediaId(image.mediaId),caption:cleanText(image.caption,500)})).filter(image=>image.mediaId):[],status:status(item.status,['draft','published','archived'],'published')})),
    jobs:value.jobs.map(item=>({id:cleanText(item.id,100),slug:cleanText(item.slug,100),title:cleanText(item.title,200),department:cleanText(item.department,120),category:['sales','operations','tech'].includes(item.category)?item.category:'operations',employmentType:cleanText(item.employmentType,80),location:cleanText(item.location,150),workSetup:status(item.workSetup,['onsite','hybrid','remote'],'onsite'),applicationUrl:cleanHttpsUrl(item.applicationUrl),priority:['urgent','active','open'].includes(item.priority)?item.priority:'open',summary:cleanText(item.summary,5000),description:cleanText(item.description,10000),responsibilities:Array.isArray(item.responsibilities)?item.responsibilities.slice(0,100).map(value=>cleanText(value,1000)).filter(Boolean):[],qualifications:Array.isArray(item.qualifications)?item.qualifications.slice(0,100).map(value=>cleanText(value,1000)).filter(Boolean):[],image:cleanUrl(item.image),imageMediaId:cleanMediaId(item.imageMediaId),status:status(item.status,['draft','open','closed','archived'],'open'),publishedAt:cleanText(item.publishedAt,100),closesAt:cleanText(item.closesAt,100)}))
  };
}

async function bundledContent(){return normalizeContent(JSON.parse(await readFile(defaultFile,'utf8')))}
async function loadPublicContent(){
  try{
    const content=await loadContentFromDatabase();
    return content.persistence.empty?await bundledContent():content;
  }catch(error){
    console.error('Supabase public content load failed; using bundled content:',error.message);
    return bundledContent();
  }
}
async function loadAdminContent(){
  const content=await loadContentFromDatabase({includeUnpublished:true});
  return content.persistence.empty?{...(await bundledContent()),persistence:{source:'bundled',empty:true}}:content;
}

async function handler(request,response){
  securityHeaders(response);
  const corsAllowed=applyCors(request,response);
  if(request.method==='OPTIONS'){
    if(!corsAllowed){sendJson(response,403,{error:'Origin not allowed.'});return}
    response.writeHead(204);response.end();return;
  }
  if(!corsAllowed){sendJson(response,403,{error:'Origin not allowed.'});return}
  const url=new URL(request.url,'http://localhost');
  try{
    if(request.method==='GET'&&url.pathname==='/health'){sendJson(response,200,{status:'ok',database:supabaseConfigured?'configured':'missing'});return}
    if(request.method==='GET'&&url.pathname==='/content'){sendJson(response,200,await loadPublicContent());return}
    if(request.method==='POST'&&url.pathname==='/auth/login-entry/click'){advanceLoginEntry(request,response);return}
    if(request.method==='GET'&&url.pathname==='/auth/login-entry'){
      if(!loginEntryAllowed(request)){sendJson(response,404,{error:'Not found.'});return}
      sendJson(response,200,{allowed:true});return;
    }
    if(request.method==='POST'&&url.pathname==='/auth/login'){
      if(!loginEntryAllowed(request)){sendJson(response,404,{error:'Not found.'});return}
      if(!canAttemptLogin(request)){response.setHeader('Retry-After','900');sendJson(response,429,{error:'Too many login attempts. Try again later.'});return}
      const body=await readJson(request,16*1024),email=String(body.email||'').trim().toLowerCase();
      if(email!==adminEmail||!(await verifyPassword(body.password))){await new Promise(resolve=>setTimeout(resolve,350));sendJson(response,401,{error:'Email or password is incorrect.'});return}
      clearAttempts(request);
      const session=createSession();
      response.setHeader('Set-Cookie',[sessionCookie(session.token),temporaryCookie('ace_login_access','',0),temporaryCookie('ace_login_clicks','',0)]);
      sendJson(response,200,{authenticated:true,email:adminEmail,csrfToken:session.csrf});return;
    }
    if(request.method==='GET'&&url.pathname==='/auth/session'){
      const session=requireSession(request,response);if(!session)return;
      sendJson(response,200,{authenticated:true,email:adminEmail,csrfToken:session.csrf});return;
    }
    if(request.method==='GET'&&url.pathname==='/admin/content'){
      const session=requireSession(request,response);if(!session)return;
      sendJson(response,200,await loadAdminContent());return;
    }
    if(request.method==='POST'&&url.pathname==='/auth/logout'){
      const session=requireSession(request,response,true);if(!session)return;
      response.setHeader('Set-Cookie',sessionCookie('',0));
      sendJson(response,200,{authenticated:false});return;
    }
    if(request.method==='PUT'&&(url.pathname==='/content'||url.pathname==='/admin/content')){
      const session=requireSession(request,response,true);if(!session)return;
      const content=await replaceContentInDatabase(normalizeContent(await readJson(request)));
      sendJson(response,200,content);return;
    }
    if(request.method==='POST'&&url.pathname==='/media'){
      const session=requireSession(request,response,true);if(!session)return;
      const upload=await parseImageUpload(request);
      sendJson(response,201,await storeImage(upload));return;
    }
    const mediaDelete=url.pathname.match(/^\/media\/([0-9a-f-]{36})$/i);
    if(request.method==='DELETE'&&mediaDelete){
      const session=requireSession(request,response,true);if(!session)return;
      sendJson(response,200,await deleteStoredImage(mediaDelete[1]));return;
    }
    sendJson(response,404,{error:'Not found.'});
  }catch(error){
    console.error(`${request.method} ${url.pathname}:`,error.message);
    sendJson(response,error.status||500,{error:error.status?error.message:'Server error.'});
  }
}

assertConfiguration();
const server=http.createServer(handler);
server.requestTimeout=90_000;
server.headersTimeout=15_000;
server.listen(port,'0.0.0.0',()=>console.log(`ACE admin API listening on port ${port}`));
