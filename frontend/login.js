document.addEventListener('DOMContentLoaded',async()=>{
  const form=document.querySelector('[data-login-form]');
  if(!form||!window.ACECMS)return;
  if(ACECMS.isSignedIn()){window.location.replace('admin.html');return}
  const firstSetup=!(await ACECMS.hasAdmin());
  const title=document.querySelector('[data-login-title]'),intro=document.querySelector('[data-login-intro]'),submit=document.querySelector('[data-login-submit]'),confirmField=document.querySelector('[data-confirm-field]'),confirmInput=document.querySelector('#admin-confirm'),status=document.querySelector('[data-login-status]');
  if(firstSetup){title.textContent='Create admin access.';intro.textContent='Set the email and password you will use to manage the website on this device.';submit.textContent='Create account';confirmField.hidden=false;confirmInput.required=true}
  const showStatus=(message,error=false)=>{status.textContent=message;status.classList.add('show');status.classList.toggle('error',error)};
  form.addEventListener('submit',async event=>{
    event.preventDefault();status.classList.remove('show','error');submit.disabled=true;
    const data=new FormData(form),email=data.get('email'),password=String(data.get('password')||'');
    try{
      if(firstSetup){
        if(password.length<8){showStatus('Use at least 8 characters for the password.',true);return}
        if(password!==data.get('confirmPassword')){showStatus('The passwords do not match.',true);return}
        await ACECMS.createAdmin(email,password);
      }else if(!(await ACECMS.verifyAdmin(email,password))){showStatus('Email or password is incorrect.',true);return}
      ACECMS.signIn();window.location.assign('admin.html');
    }catch(error){showStatus('Admin access could not be saved in this browser.',true)}finally{submit.disabled=false}
  });
});
