import { scrypt as scryptCallback, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const scrypt=promisify(scryptCallback);
const port=11247;
const origin='http://localhost:5500';
const userAgent='ACE login-entry integration test';
const password='Local-test-password-2026!';
const email='admin@example.test';
const salt=randomBytes(16);
const derived=await scrypt(password,salt,64);
const passwordHash=`scrypt$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
const backendRoot=resolve(import.meta.dirname,'..');
const server=spawn(process.execPath,['server.mjs'],{cwd:backendRoot,env:{...process.env,PORT:String(port),NODE_ENV:'development',ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:passwordHash,SESSION_SECRET:'integration-test-secret-that-is-longer-than-32-characters',FRONTEND_ORIGIN:origin,LOGIN_ENTRY_GRANT_SECONDS:'3'},stdio:['ignore','pipe','pipe']});
let serverErrors='';
server.stderr.on('data',chunk=>{serverErrors+=chunk});

const sleep=milliseconds=>new Promise(resolvePromise=>setTimeout(resolvePromise,milliseconds));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const splitSetCookie=value=>String(value||'').split(/,(?=\s*ace_[a-z_]+=)/i).filter(Boolean);

function client(address){
  const jar=new Map();
  return async(path,{method='GET',body}={})=>{
    const headers={Accept:'application/json',Origin:origin,'Sec-Fetch-Site':'same-origin','User-Agent':userAgent,'X-Forwarded-For':address};
    if(jar.size)headers.Cookie=[...jar].map(([name,value])=>`${name}=${value}`).join('; ');
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(`http://127.0.0.1:${port}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const rawCookies=response.headers.getSetCookie?.()||splitSetCookie(response.headers.get('set-cookie'));
    for(const rawCookie of rawCookies){
      const pair=rawCookie.split(';',1)[0],separator=pair.indexOf('=');
      if(separator<0)continue;
      const name=pair.slice(0,separator),value=pair.slice(separator+1),remove=/Max-Age=0/i.test(rawCookie);
      if(remove)jar.delete(name);else jar.set(name,value);
    }
    let data=null;
    try{data=await response.json()}catch{}
    return {status:response.status,data};
  };
}

async function waitForServer(){
  for(let attempt=0;attempt<60;attempt+=1){
    if(server.exitCode!==null)throw new Error(`Server exited before tests started. ${serverErrors}`);
    try{if((await fetch(`http://127.0.0.1:${port}/health`)).ok)return}catch{}
    await sleep(100);
  }
  throw new Error('Timed out waiting for the local API.');
}

async function unlock(send){
  for(let click=1;click<=10;click+=1){
    const result=await send('/auth/login-entry/click',{method:'POST'});
    assert(result.status===200,`Click ${click} returned ${result.status}`);
    assert(Boolean(result.data?.unlocked)===(click===10),`Click ${click} had an unexpected unlock state`);
    if(click<10)await sleep(70);
  }
}

try{
  await waitForServer();

  const direct=client('198.51.100.10');
  assert((await direct('/auth/login-entry')).status===404,'Direct login-interface access was not denied');
  assert((await direct('/auth/login',{method:'POST',body:{email,password}})).status===404,'Direct login submission was not denied');

  const gateOnly=client('198.51.100.11');
  await unlock(gateOnly);
  assert((await gateOnly('/auth/login-entry')).status===200,'Valid trigger did not grant login-interface access');
  assert((await gateOnly('/auth/session')).status===401,'Trigger alone created an authenticated session');
  assert((await gateOnly('/admin/content')).status===401,'Trigger alone accessed a protected API');

  const expiring=client('198.51.100.12');
  await unlock(expiring);
  await sleep(3200);
  assert((await expiring('/auth/login-entry')).status===404,'Expired login-interface grant was accepted');

  const invalid=client('198.51.100.13');
  await unlock(invalid);
  for(let attempt=1;attempt<=5;attempt+=1)assert((await invalid('/auth/login',{method:'POST',body:{email,password:'incorrect-password'}})).status===401,`Invalid credential attempt ${attempt} was not rejected`);
  assert((await invalid('/auth/login',{method:'POST',body:{email,password:'incorrect-password'}})).status===429,'Login rate limiting did not activate');

  const valid=client('198.51.100.14');
  await unlock(valid);
  assert((await valid('/auth/login',{method:'POST',body:{email,password}})).status===200,'Valid administrator credentials were rejected');
  assert((await valid('/auth/session')).status===200,'Authenticated session did not take over after login');

  const loginHtml=await readFile(resolve(backendRoot,'../frontend/login.html'),'utf8');
  assert(loginHtml.indexOf('data-login-not-found')<loginHtml.indexOf('data-login-shell hidden'),'The login document does not default to generic not-found content');
  process.stdout.write('Login-entry integration checks passed.\n');
}finally{
  server.kill();
}
