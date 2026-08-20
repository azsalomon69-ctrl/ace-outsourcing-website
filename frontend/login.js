document.addEventListener('DOMContentLoaded',async()=>{
  const form=document.querySelector('[data-login-form]');
  const loginShell=document.querySelector('[data-login-shell]'),notFound=document.querySelector('[data-login-not-found]');
  if(!form||!loginShell||!notFound||!window.ACECMS)return;
  const submit=document.querySelector('[data-login-submit]'),status=document.querySelector('[data-login-status]');
  const showStatus=(message,error=false)=>{status.textContent=message;status.classList.add('show');status.classList.toggle('error',error)};
  let ready=false;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!ready){showStatus('Secure login is still connecting. Please wait a moment.',true);return}
    status.classList.remove('show','error');submit.disabled=true;
    const data=new FormData(form),email=data.get('email'),password=String(data.get('password')||'');
    try{
      await ACECMS.login(email,password);
      window.location.assign('admin.html');
    }catch(error){showStatus(error.message||'Sign in failed.',true)}finally{submit.disabled=false}
  });
  if(!ACECMS.isConfigured)return;
  try{
    if(await ACECMS.getSession()){window.location.replace('admin.html');return}
    if(!(await ACECMS.hasLoginEntryAccess()))return;
    notFound.hidden=true;loginShell.hidden=false;document.body.classList.remove('login-gate-pending');
    ready=true;submit.disabled=false;status.classList.remove('show','error');
  }catch{}
});
