try {
  if (sessionStorage.getItem('aceInternalNavigation') === '1') {
    document.documentElement.classList.add('page-enter-pending');
  }
} catch {}
