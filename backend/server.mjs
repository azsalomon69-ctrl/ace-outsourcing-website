import http from 'node:http';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const scrypt=promisify(scryptCallback);
const directory=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT)||10000;
const production=process.env.NODE_ENV==='production';
const adminEmail=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
const adminPasswordHash=String(process.env.ADMIN_PASSWORD_HASH||'');
const sessionSecret=String(process.env.SESSION_SECRET||'');
const frontendOrigin=String(process.env.FRONTEND_ORIGIN||'').replace(/\/$/,'');
const contentFile=resolve(process.env.CONTENT_FILE||resolve(directory,'data/content.json'));
const defaultFile=resolve(directory,'data/default-content.json');
const sessionHours=Math.max(1,Math.min(24,Number(process.env.SESSION_HOURS)||8));
const loginAttempts=new Map();

function assertConfiguration(){
  const missing=[];
  if(!adminEmail)missing.push('ADMIN_EMAIL');
  if(!adminPasswordHash)missing.push('ADMIN_PASSWORD_HASH');
  if(sessionSecret.length<32)missing.push('SESSION_SECRET (at least 32 characters)');
  if(production&&!frontendOrigin)missing.push('FRONTEND_ORIGIN');
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
    response.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,OPTIONS');
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
function createSession(){
  const csrf=randomBytes(24).toString('base64url');
  const payload=Buffer.from(JSON.stringify({csrf,expires:Date.now()+sessionHours*60*60*1000,nonce:randomBytes(16).toString('base64url')})).toString('base64url');
  return {token:`${payload}.${sign(payload)}`,csrf};
}
function verifySession(request){
  const token=cookies(request).ace_session;
  if(!token)return null;
  const [payload,signature]=token.split('.');
  if(!payload||!signature)return null;
  const expected=Buffer.from(sign(payload));
  const actual=Buffer.from(signature);
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
  try{const session=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return session.csrf&&session.expires>Date.now()?session:null}catch{return null}
}
function sessionCookie(token,maxAge=sessionHours*60*60){
  const path=production?'/api':'/';
  return `ace_session=${encodeURIComponent(token)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production?'; Secure':''}`;
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
function canAttemptLogin(request){
  const key=clientAddress(request),now=Date.now(),windowMs=15*60*1000;
  const record=loginAttempts.get(key);
  if(!record||now-record.started>windowMs){loginAttempts.set(key,{started:now,count:1});return true}
  record.count+=1;
  return record.count<=5;
}
function clearAttempts(request){loginAttempts.delete(clientAddress(request))}

function normalizeContent(value){
  if(!value||typeof value!=='object'||!Array.isArray(value.team)||!Array.isArray(value.testimonials)||!Array.isArray(value.blogs))throw Object.assign(new Error('Invalid content structure.'),{status:400});
  if(value.team.length>100||value.testimonials.length>100||value.blogs.length>250)throw Object.assign(new Error('Content collection limit exceeded.'),{status:400});
  const cleanText=(input,max=20000)=>String(input??'').slice(0,max);
  const cleanUrl=input=>{const value=cleanText(input,4*1024*1024);if(/^data:image\/(png|jpeg|webp|gif);base64,/i.test(value)||value.startsWith('assets/'))return value;return ''};
  return {
    team:value.team.map(item=>({id:cleanText(item.id,100),name:cleanText(item.name,150),role:cleanText(item.role,150),quote:cleanText(item.quote,2000),image:cleanUrl(item.image)})),
    testimonials:value.testimonials.map(item=>({id:cleanText(item.id,100),name:cleanText(item.name,150),company:cleanText(item.company,200),quote:cleanText(item.quote,4000),logo:cleanUrl(item.logo),rating:Math.max(1,Math.min(5,Number(item.rating)||5))})),
    blogs:value.blogs.map(item=>({id:cleanText(item.id,100),title:cleanText(item.title,250),category:cleanText(item.category,100),author:cleanText(item.author,150),date:cleanText(item.date,100),excerpt:cleanText(item.excerpt,2000),body:cleanText(item.body,50000),cover:cleanUrl(item.cover),images:Array.isArray(item.images)?item.images.slice(0,100).map(cleanUrl).filter(Boolean):[]}))
  };
}

async function loadContent(){
  try{return normalizeContent(JSON.parse(await readFile(contentFile,'utf8')))}catch(error){
    if(error.code!=='ENOENT')console.error('Content load failed:',error.message);
    const defaults=normalizeContent(JSON.parse(await readFile(defaultFile,'utf8')));
    await saveContent(defaults);
    return defaults;
  }
}
async function saveContent(content){
  const clean=normalizeContent(content);
  await mkdir(dirname(contentFile),{recursive:true});
  const temporary=`${contentFile}.${process.pid}.tmp`;
  await writeFile(temporary,JSON.stringify(clean,null,2),{encoding:'utf8',mode:0o600});
  await rename(temporary,contentFile);
  return clean;
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
    if(request.method==='GET'&&url.pathname==='/health'){sendJson(response,200,{status:'ok'});return}
    if(request.method==='GET'&&url.pathname==='/content'){sendJson(response,200,await loadContent());return}
    if(request.method==='POST'&&url.pathname==='/auth/login'){
      if(!canAttemptLogin(request)){response.setHeader('Retry-After','900');sendJson(response,429,{error:'Too many login attempts. Try again later.'});return}
      const body=await readJson(request,16*1024),email=String(body.email||'').trim().toLowerCase();
      if(email!==adminEmail||!(await verifyPassword(body.password))){await new Promise(resolve=>setTimeout(resolve,350));sendJson(response,401,{error:'Email or password is incorrect.'});return}
      clearAttempts(request);
      const session=createSession();
      response.setHeader('Set-Cookie',sessionCookie(session.token));
      sendJson(response,200,{authenticated:true,email:adminEmail,csrfToken:session.csrf});return;
    }
    if(request.method==='GET'&&url.pathname==='/auth/session'){
      const session=requireSession(request,response);if(!session)return;
      sendJson(response,200,{authenticated:true,email:session.email,csrfToken:session.csrf});return;
    }
    if(request.method==='POST'&&url.pathname==='/auth/logout'){
      const session=requireSession(request,response,true);if(!session)return;
      response.setHeader('Set-Cookie',sessionCookie('',0));
      sendJson(response,200,{authenticated:false});return;
    }
    if(request.method==='PUT'&&url.pathname==='/content'){
      const session=requireSession(request,response,true);if(!session)return;
      const content=await saveContent(await readJson(request));
      sendJson(response,200,content);return;
    }
    sendJson(response,404,{error:'Not found.'});
  }catch(error){
    console.error(`${request.method} ${url.pathname}:`,error.message);
    sendJson(response,error.status||500,{error:error.status?error.message:'Server error.'});
  }
}

assertConfiguration();
const server=http.createServer(handler);
server.requestTimeout=30_000;
server.headersTimeout=15_000;
server.listen(port,'0.0.0.0',()=>console.log(`ACE admin API listening on port ${port}`));
