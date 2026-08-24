try {
 const navigation=performance.getEntriesByType('navigation')[0];
 const arrivedInternally=sessionStorage.getItem('aceInternalNavigation')==='1';
 sessionStorage.removeItem('aceInternalNavigation');
 if(navigation?.type==='reload'||(navigation?.type!=='back_forward'&&!arrivedInternally))document.documentElement.classList.add('opening-splash-active');
} catch {
 document.documentElement.classList.add('opening-splash-active');
}
