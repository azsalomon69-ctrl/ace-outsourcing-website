document.addEventListener('DOMContentLoaded',async()=>{
  const form=document.querySelector('[data-login-form]');
  if(!form||!window.ACECMS)return;
  if(await ACECMS.getSession()){window.location.replace('admin.html');return}
  const submit=document.querySelector('[data-login-submit]'),status=document.querySelector('[data-login-status]');
  const showStatus=(message,error=false)=>{status.textContent=message;status.classList.add('show');status.classList.toggle('error',error)};
  if(!ACECMS.isConfigured)showStatus('The Render backend URL has not been connected yet.',true);
  form.addEventListener('submit',async event=>{
    event.preventDefault();status.classList.remove('show','error');submit.disabled=true;
    const data=new FormData(form),email=data.get('email'),password=String(data.get('password')||'');
    try{
      await ACECMS.login(email,password);
      window.location.assign('admin.html');
    }catch(error){showStatus(error.message||'Sign in failed.',true)}finally{submit.disabled=false}
  });
});
