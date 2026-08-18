document.addEventListener('DOMContentLoaded',async()=>{
 const page=document.body.dataset.page||'';
 const header=document.querySelector('[data-site-header]');
 const footer=document.querySelector('[data-site-footer]');
 const nav=[['index.html','Home','home'],['about.html','About','about'],['services.html','Services','services'],['careers.html','Careers','careers'],['blog.html','Journal','blog']];
 if(header)header.innerHTML=`<header class="site-header"><div class="container nav"><a class="brand" href="index.html"><img src="assets/ACE.png" alt="ACE Outsource Solutions"><strong>ACE Outsource Solutions</strong><small>Expert Service, Beyond Borders</small></a><button class="menu-toggle" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button><nav class="nav-links" aria-label="Main navigation">${nav.map(n=>`<a href="${n[0]}" class="${page===n[2]?'active':''}">${n[1]}</a>`).join('')}<a class="btn btn-dark" href="contact.html">Let’s talk <span>↗</span></a></nav></div></header>`;
 if(footer)footer.innerHTML=`<footer class="footer"><div class="container"><div class="footer-grid"><div class="footer-brand"><a class="brand" href="index.html"><img src="assets/ACE.png" alt=""><strong>ACE Outsource Solutions</strong><small>Expert Service, Beyond Borders</small></a><p>Flexible people and operations support for ambitious businesses, built in Laguna and delivered worldwide.</p></div><div><h4>Explore</h4><div class="footer-links"><a href="about.html">About us</a><a href="services.html">Services</a><a href="careers.html">Careers</a><a href="blog.html">Team journal</a></div></div><div><h4>Services</h4><div class="footer-links"><a href="services.html#bpo">BPO full service</a><a href="services.html#seat">Seat lease</a><a href="services.html#recruitment">Recruitment</a><a href="services.html#talent">Talent sourcing</a></div></div><div><h4>Get in touch</h4><div class="footer-links"><a href="tel:+639544423271">+63 954 442 3271</a><a href="mailto:info@ace-outsourcing.com">Client partnerships: info@ace-outsourcing.com</a><a href="mailto:hr@ace-outsourcing.com">Careers: hr@ace-outsourcing.com</a><a href="contact.html">Santa Rosa, Laguna</a></div></div></div><div class="footer-bottom"><span><span data-hidden-login-trigger>© ${new Date().getFullYear()} ACE Outsource Solutions.</span> Third-party marks belong to their respective owners.</span><span><a href="privacy.html">Privacy and cookies</a> &nbsp;·&nbsp; <a href="https://www.facebook.com/aceoutsourcingsolutions" target="_blank" rel="noopener">Facebook</a> &nbsp;·&nbsp; <a href="https://www.linkedin.com/company/ace-outsource-solutions/" target="_blank" rel="noopener">LinkedIn</a></span></div></div></footer>`;
 const hiddenLoginTrigger=document.querySelector('[data-hidden-login-trigger]');
 let hiddenLoginClicks=0;
 hiddenLoginTrigger?.addEventListener('click',()=>{hiddenLoginClicks+=1;if(hiddenLoginClicks>=10)window.location.assign('login.html')});
 const mapContainer=document.querySelector('[data-map-container]');
 document.querySelector('[data-map-load]')?.addEventListener('click',()=>{
  const iframe=document.createElement('iframe');
  iframe.className='street-view-frame';iframe.src=mapContainer.dataset.mapSrc;iframe.title='Street View of ACE Outsource Solutions at Paseo de Sta. Rosa';iframe.loading='lazy';iframe.allowFullscreen=true;iframe.referrerPolicy='no-referrer';
  mapContainer.replaceWith(iframe);
 });
 const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
 const cmsContent=window.ACECMS?await ACECMS.getContent():null;
 if(cmsContent){
  const teamGrid=document.querySelector('.team-grid');
  if(teamGrid)teamGrid.innerHTML=cmsContent.team.map(member=>`<article class="team-card"><img src="${escapeHtml(member.image)}" alt="${escapeHtml(`${member.name}, ACE ${member.role}`)}" loading="lazy"><div><small>${escapeHtml(member.role)}</small><h3>${escapeHtml(member.name)}</h3><p>“${escapeHtml(member.quote)}”</p></div></article>`).join('');
  const homeJournal=document.querySelector('.journal-grid');
  if(homeJournal)homeJournal.innerHTML=cmsContent.blogs.slice(0,3).map(post=>`<article class="post"><img class="post-image" src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" loading="lazy"><small>${escapeHtml(post.category)}</small><h3>${escapeHtml(post.title)}</h3><a class="text-link" href="blog.html#${escapeHtml(post.id)}">Read story <span>→</span></a></article>`).join('');
  const journalList=document.querySelector('.journal-entry-list');
  if(journalList)journalList.innerHTML=cmsContent.blogs.map(post=>{const paragraphs=String(post.body||'').split(/\n{2,}/).map(paragraph=>`<p>${escapeHtml(paragraph)}</p>`).join(''),photos=(post.images?.length?post.images:[post.cover]).filter(Boolean).map((image,index)=>`<img src="${escapeHtml(image)}" alt="${escapeHtml(`${post.title} photo ${index+1}`)}">`).join('');return `<details class="journal-entry" id="${escapeHtml(post.id)}"><summary><img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}"><span class="journal-entry-heading"><span class="article-meta"><span>${escapeHtml(post.author||'ACE Team')}</span><span>${escapeHtml(post.date)}</span><span>${escapeHtml(post.category)}</span></span><strong>${escapeHtml(post.title)}</strong><small>Read story</small></span></summary><div class="journal-entry-body"><div class="article-meta"><span>${escapeHtml(post.author||'ACE Team')}</span><span>${escapeHtml(post.date)}</span><span>${escapeHtml(post.category)}</span></div>${post.excerpt?`<p class="article-lead">${escapeHtml(post.excerpt)}</p>`:''}${paragraphs}${photos?`<div class="journal-gallery" aria-label="${escapeHtml(post.title)} photo gallery">${photos}</div>`:''}</div></details>`}).join('');
  const managedJobs=document.querySelector('[data-managed-jobs]');
  if(managedJobs){
   const priorityLabels={urgent:'Urgent hiring',active:'Actively hiring',open:'Accepting applications'};
   const list=(items,label)=>items?.length?`<div><h4>${label}</h4><ul>${items.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`:'';
   managedJobs.innerHTML=(cmsContent.jobs||[]).map((job,index)=>`<details class="job-opening" data-role="${escapeHtml(job.category)}" ${index===0?'open':''}><summary><span><small>${escapeHtml(job.department)} · ${escapeHtml(job.employmentType)}${job.location?` · ${escapeHtml(job.location)}`:''}</small><strong>${escapeHtml(job.title)}</strong><em class="job-priority job-priority-${escapeHtml(job.priority)}">${escapeHtml(priorityLabels[job.priority]||priorityLabels.open)}</em></span><b>View role</b></summary><div class="job-content"><span class="job-priority job-priority-${escapeHtml(job.priority)}">${escapeHtml(priorityLabels[job.priority]||priorityLabels.open)}</span><h3>${escapeHtml(job.title)}</h3><p class="job-lead">${escapeHtml(job.summary)}</p>${job.responsibilities?.length||job.qualifications?.length?`<div class="job-columns">${list(job.responsibilities,'Key responsibilities')}${list(job.qualifications,'Qualifications')}</div>`:''}<a class="btn btn-dark" href="#apply">Apply for this role <span>→</span></a></div></details>`).join('')||'<div class="admin-empty">There are no open positions right now. Please check again soon.</div>';
   const roleSelect=document.querySelector('#career-role');
   if(roleSelect)roleSelect.innerHTML=(cmsContent.jobs||[]).map(job=>`<option>${escapeHtml(job.title)}</option>`).join('')+'<option>Other / General application</option>';
  }
 }
 const toggle=document.querySelector('.menu-toggle'),links=document.querySelector('.nav-links');
 toggle?.addEventListener('click',()=>{const open=links.classList.toggle('open');toggle.setAttribute('aria-expanded',open);document.body.classList.toggle('menu-open',open)});
 document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>{links?.classList.remove('open');document.body.classList.remove('menu-open')}));
 const defaultQuotes=[
  {text:'We could not be happier with our team. They are loyal, hardworking and dedicated. ACE helped us lower costs while improving our sales growth.',name:'Jenny M.',company:'Be There Solutions',logo:'assets/be-there-solutions.png'},
  {text:'ACE helped us put a plan in place to build and scale as our platform requires more manpower. We are excited about the journey and the outcome ahead.',name:'Adam J.',company:'Figshelf',logo:'assets/figshelf.png'},
  {text:'From day one, ACE was professional and created a plan to recruit, onboard, train and grow my sales team. The results have been excellent.',name:'Shai A.',company:'Green Marketing',logo:'assets/green-marketing.png'}
 ],quotes=cmsContent?cmsContent.testimonials:defaultQuotes;
 let quoteIndex=0;const quoteText=document.querySelector('[data-quote-text]'),quoteName=document.querySelector('[data-quote-name]'),quoteCompany=document.querySelector('[data-quote-company]'),quoteLogo=document.querySelector('[data-quote-logo]'),quoteCount=document.querySelector('[data-quote-count]');
 function showQuote(){if(!quoteText)return;if(!quotes.length){quoteText.textContent='No client stories are published yet.';if(quoteName)quoteName.textContent='';if(quoteCompany)quoteCompany.textContent='';if(quoteLogo)quoteLogo.hidden=true;if(quoteCount)quoteCount.textContent='00 / 00';document.querySelector('.quote-card .quote-stars')?.replaceChildren();document.querySelector('.quote-controls')?.setAttribute('hidden','');return}const q=quotes[quoteIndex],rating=Math.max(1,Math.min(5,Number(q.rating)||5)),stars='★'.repeat(rating)+'☆'.repeat(5-rating);quoteText.textContent=q.quote||q.text;quoteName.textContent=q.name;quoteCompany.textContent=q.company;if(quoteLogo){quoteLogo.hidden=false;quoteLogo.src=q.logo;quoteLogo.alt=`${q.company} logo`}document.querySelector('.quote-card .quote-stars')?.replaceChildren(document.createTextNode(stars));if(quoteCount)quoteCount.textContent=`${String(quoteIndex+1).padStart(2,'0')} / ${String(quotes.length).padStart(2,'0')}`}
 const ratingValue=document.querySelector('.rating-summary>strong'),ratingStars=document.querySelector('.rating-summary .rating-stars');if(quotes.length){const average=quotes.reduce((total,quote)=>total+(Number(quote.rating)||5),0)/quotes.length;if(ratingValue)ratingValue.textContent=average.toFixed(1);if(ratingStars)ratingStars.textContent='★'.repeat(Math.round(average))+'☆'.repeat(5-Math.round(average))}else{if(ratingValue)ratingValue.textContent='0.0';if(ratingStars)ratingStars.textContent='☆☆☆☆☆'}
 document.querySelector('[data-quote-next]')?.addEventListener('click',()=>{if(!quotes.length)return;quoteIndex=(quoteIndex+1)%quotes.length;showQuote()});
 document.querySelector('[data-quote-prev]')?.addEventListener('click',()=>{if(!quotes.length)return;quoteIndex=(quoteIndex-1+quotes.length)%quotes.length;showQuote()});showQuote();
 const jobOpenings=[...document.querySelectorAll('.job-opening')],jobList=document.querySelector('.job-list'),wideJobs=window.matchMedia('(min-width:901px)');
 let selectedJob=jobOpenings.find(job=>job.open)||jobOpenings[0],jobPreview;
 if(jobList){jobPreview=document.createElement('aside');jobPreview.className='job-preview';jobPreview.setAttribute('aria-live','polite');jobPreview.setAttribute('aria-label','Selected job details');jobList.append(jobPreview)}
 function showJob(job){if(!job||!jobPreview)return;selectedJob=job;jobOpenings.forEach(item=>{item.open=false;item.classList.toggle('selected',item===job)});jobPreview.innerHTML=job.querySelector('.job-content')?.innerHTML||'';jobPreview.hidden=false;jobPreview.scrollTop=0}
 function syncJobLayout(){if(!jobPreview)return;if(wideJobs.matches){const visibleSelected=selectedJob&&!selectedJob.classList.contains('hidden')?selectedJob:jobOpenings.find(job=>!job.classList.contains('hidden'));showJob(visibleSelected)}else{jobPreview.hidden=true;jobOpenings.forEach(job=>job.classList.remove('selected'))}}
 jobOpenings.forEach(opening=>{opening.addEventListener('toggle',()=>{if(wideJobs.matches||!opening.open)return;jobOpenings.forEach(other=>{if(other!==opening)other.open=false})});opening.querySelector('summary')?.addEventListener('click',event=>{if(!wideJobs.matches)return;event.preventDefault();showJob(opening)})});
 document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const value=btn.dataset.filter;jobOpenings.forEach(card=>{const hidden=value!=='all'&&card.dataset.role!==value;card.classList.toggle('hidden',hidden);if(hidden)card.open=false});if(wideJobs.matches){const next=selectedJob&&!selectedJob.classList.contains('hidden')?selectedJob:jobOpenings.find(card=>!card.classList.contains('hidden'));showJob(next)}}));
 wideJobs.addEventListener?.('change',syncJobLayout);syncJobLayout();
 const journalEntries=[...document.querySelectorAll('.journal-entry')];
 if(journalEntries.length){
  const journalModal=document.createElement('dialog');
  journalModal.className='journal-modal';
  journalModal.setAttribute('aria-label','Team Journal story');
  journalModal.innerHTML='<button class="journal-modal-close" type="button" aria-label="Close story">&times;</button><div class="journal-modal-content" data-journal-modal-content></div>';
  document.body.append(journalModal);
  const modalContent=journalModal.querySelector('[data-journal-modal-content]');
  const openJournal=entry=>{
   const cover=entry.querySelector('summary > img'),heading=entry.querySelector('.journal-entry-heading strong'),body=entry.querySelector('.journal-entry-body');
   if(!cover||!heading||!body||!modalContent)return;
   journalEntries.forEach(item=>item.open=false);
   modalContent.replaceChildren();
   const media=document.createElement('div'),leadImage=cover.cloneNode(true),article=document.createElement('article'),title=document.createElement('h2');
   media.className='journal-modal-media';leadImage.removeAttribute('style');media.append(leadImage);
   article.className='journal-modal-article';title.textContent=heading.textContent;article.append(title,body.cloneNode(true));
   modalContent.append(media,article);
   modalContent.querySelectorAll('.journal-gallery').forEach(gallery=>{
    const photos=[...gallery.querySelectorAll('img')];
    if(!photos.length)return;
    let current=0;
    gallery.classList.add('journal-carousel');
    const previous=document.createElement('button'),next=document.createElement('button'),counter=document.createElement('span');
    previous.type='button';previous.className='journal-carousel-button previous';previous.setAttribute('aria-label','Previous photo');previous.innerHTML='&#8592;';
    next.type='button';next.className='journal-carousel-button next';next.setAttribute('aria-label','Next photo');next.innerHTML='&#8594;';
    counter.className='journal-carousel-counter';counter.setAttribute('aria-live','polite');
    const showPhoto=index=>{current=(index+photos.length)%photos.length;photos.forEach((photo,photoIndex)=>photo.classList.toggle('active',photoIndex===current));counter.textContent=`${current+1} / ${photos.length}`};
    previous.addEventListener('click',()=>showPhoto(current-1));next.addEventListener('click',()=>showPhoto(current+1));
    gallery.append(previous,next,counter);showPhoto(0);
   });
   journalModal.showModal();
   document.body.classList.add('modal-open');
   journalModal.scrollTop=0;
  };
  journalEntries.forEach(entry=>entry.querySelector('summary')?.addEventListener('click',event=>{event.preventDefault();openJournal(entry)}));
  journalModal.querySelector('.journal-modal-close')?.addEventListener('click',()=>journalModal.close());
  journalModal.addEventListener('click',event=>{if(event.target===journalModal)journalModal.close()});
  journalModal.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')journalModal.querySelector('.journal-carousel-button.previous')?.click();if(event.key==='ArrowRight')journalModal.querySelector('.journal-carousel-button.next')?.click()});
  journalModal.addEventListener('close',()=>document.body.classList.remove('modal-open'));
  if(location.hash){const linkedEntry=document.querySelector(location.hash);if(linkedEntry?.classList.contains('journal-entry'))openJournal(linkedEntry)}
 }
 document.querySelectorAll('[data-service-modal]').forEach(trigger=>trigger.addEventListener('click',()=>{const modal=document.getElementById(trigger.dataset.serviceModal);if(!modal)return;modal.showModal();modal.scrollTop=0;document.body.classList.add('modal-open')}));
 document.querySelectorAll('.service-modal').forEach(modal=>{modal.querySelector('[data-modal-close]')?.addEventListener('click',()=>modal.close());modal.addEventListener('click',event=>{if(event.target===modal)modal.close()});modal.addEventListener('close',()=>document.body.classList.remove('modal-open'))});
 document.querySelectorAll('form[data-demo-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const status=form.querySelector('.form-status'),file=form.querySelector('input[type="file"]'),cv=file?.files?.[0];if(!form.checkValidity()){form.reportValidity();return}if(cv&&cv.type!=='application/pdf'){if(status){status.textContent='Please upload your CV as a PDF file.';status.classList.add('show')}return}if(cv&&cv.size>12*1024*1024){if(status){status.textContent='Your CV must be 12 MB or smaller.';status.classList.add('show')}return}if(status){status.textContent=form.dataset.success||'Thanks! Your message is ready for the ACE team.';status.classList.add('show')}form.reset()}));
});
