document.addEventListener('DOMContentLoaded',async()=>{
  if(!window.ACECMS||!(await ACECMS.getSession())){window.location.replace('login.html');return}
  const editor=document.querySelector('[data-admin-editor]'),editorForm=document.querySelector('[data-admin-editor-form]'),fields=document.querySelector('[data-editor-fields]'),state=document.querySelector('[data-admin-state]');
  let content,editType='',editId='';
  try{content=await ACECMS.getAdminContent()}
  catch(error){
    state.textContent='The content service is unavailable. Check that the Render API is live and connected to Supabase, then refresh this page.';
    state.classList.add('changed','error');
    document.querySelectorAll('[data-admin-add],[data-admin-reset],[data-admin-migrate]').forEach(button=>{button.disabled=true});
    return;
  }
  if(!Array.isArray(content.jobs))content.jobs=structuredClone(ACECMS.defaults.jobs||[]);
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const imageOrFallback=(value,label)=>value?`<img src="${escapeHtml(value)}" alt="${escapeHtml(label)}">`:`<span class="admin-image-placeholder">No image</span>`;
  const setState=message=>{state.textContent=message;state.classList.add('changed');setTimeout(()=>state.classList.remove('changed'),1600)};
  const render=()=>{
    document.querySelector('[data-admin-list="team"]').innerHTML=content.team.map((item,index)=>itemCard('team',item,index,item.name,item.role,item.image)).join('')||emptyState('people');
    document.querySelector('[data-admin-list="testimonials"]').innerHTML=content.testimonials.map((item,index)=>itemCard('testimonials',item,index,item.company,item.name,item.logo)).join('')||emptyState('client stories');
    document.querySelector('[data-admin-list="blogs"]').innerHTML=content.blogs.map((item,index)=>itemCard('blogs',item,index,item.title,`${item.category} · ${item.date}`,item.cover)).join('')||emptyState('blog posts');
    document.querySelector('[data-admin-list="jobs"]').innerHTML=content.jobs.map((item,index)=>itemCard('jobs',item,index,item.title,`${priorityLabel(item.priority)} · ${item.department} · ${item.employmentType}`,'' )).join('')||emptyState('job openings');
  };
  const emptyState=label=>`<div class="admin-empty">No ${label} yet. Use the add button to create one.</div>`;
  const itemCard=(type,item,index,title,subtitle,image)=>`<article class="admin-item" data-item-type="${type}" data-item-id="${escapeHtml(item.id)}"><div class="admin-item-image">${imageOrFallback(image,title)}</div><div class="admin-item-copy"><strong>${escapeHtml(title||'Untitled')}</strong><span>${escapeHtml(subtitle||'')}</span></div><div class="admin-item-actions"><button type="button" data-move="up" aria-label="Move up" ${index===0?'disabled':''}>↑</button><button type="button" data-move="down" aria-label="Move down" ${index===content[type].length-1?'disabled':''}>↓</button><button type="button" data-edit>Edit</button><button class="remove" type="button" data-remove>Remove</button></div></article>`;
  const input=(label,name,value='',type='text',extra='')=>`<div class="field"><label for="editor-${name}">${label}</label><input id="editor-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra}></div>`;
  const textarea=(label,name,value='',help='')=>`<div class="field full"><label for="editor-${name}">${label}</label><textarea id="editor-${name}" name="${name}">${escapeHtml(value)}</textarea>${help?`<small>${escapeHtml(help)}</small>`:''}</div>`;
  const select=(label,name,value,options)=>`<div class="field"><label for="editor-${name}">${label}</label><select id="editor-${name}" name="${name}">${options.map(([key,text])=>`<option value="${escapeHtml(key)}" ${key===value?'selected':''}>${escapeHtml(text)}</option>`).join('')}</select></div>`;
  const priorityLabel=value=>({urgent:'Urgent hiring',active:'Actively hiring',open:'Accepting applications'}[value]||'Accepting applications');
  const imageFields=(urlName,urlValue,uploadName,label,multiple=false)=>`${input(`${label} path`,urlName,urlValue,'text','readonly placeholder="No uploaded image"')}<div class="field"><label for="editor-${uploadName}">${multiple?`Add ${label.toLowerCase()}`:`Upload new ${label.toLowerCase()}`}</label><input id="editor-${uploadName}" name="${uploadName}" type="file" accept="image/jpeg,image/png,image/webp,image/avif" ${multiple?'multiple':''}><small>The secure server validates, resizes, converts, and quality-optimizes the image before Supabase Storage.</small></div>`;
  const publishingFields=(item={})=>`${select('Publishing status','status',item.status||'published',[['draft','Draft'],['published','Published'],['archived','Archived']])}${select('Image rights','rightsStatus','company_owned',[['company_owned','Owned by ACE'],['client_permission','Client permission'],['licensed','Licensed for use'],['third_party','Third-party with permission']])}${input('Rights or license note','rightsNote','','text','placeholder="Optional reference or approval note"')}`;
  const openEditor=(type,item=null)=>{
    editType=type;editId=item?.id||'';
    document.querySelector('[data-editor-kicker]').textContent=item?'Edit content':'New content';
    document.querySelector('[data-editor-title]').textContent=type==='team'?(item?'Edit person':'Add person'):type==='testimonials'?(item?'Edit client story':'Add client story'):type==='blogs'?(item?'Edit blog post':'Add blog post'):(item?'Edit job opening':'Add job opening');
    if(type==='team')fields.innerHTML=`<div class="admin-editor-grid">${input('Name','name',item?.name,'text','required')}${input('Role','role',item?.role,'text','required')}${textarea('Quote','quote',item?.quote)}${publishingFields(item)}${imageFields('image',item?.image,'imageUpload','Profile image')}</div>`;
    if(type==='testimonials')fields.innerHTML=`<div class="admin-editor-grid">${input('Client name','name',item?.name,'text','required')}${input('Company','company',item?.company,'text','required')}${input('Star rating','rating',item?.rating||5,'number','min="1" max="5" step="0.1" required')}${textarea('Testimonial','quote',item?.quote)}${publishingFields(item)}${input('Permission reference','permissionReference',item?.permissionReference||'','text','placeholder="Email, agreement, or approval reference"')}<div class="field full"><label><input name="permissionConfirmed" type="checkbox" ${item?.permissionConfirmed?'checked':''}> I confirm ACE has the client’s permission to publish this testimonial and logo.</label></div>${imageFields('logo',item?.logo,'logoUpload','Company logo')}</div>`;
    if(type==='blogs'){
      const currentGallery=(item?.images||[]).map((source,index)=>`<label class="admin-gallery-edit-item"><img src="${escapeHtml(source)}" alt="Gallery image ${index+1}"><span><input type="checkbox" name="removeGallery" value="${index}"> Remove image</span></label>`).join('');
      fields.innerHTML=`<div class="admin-editor-grid">${input('Post title','title',item?.title,'text','required')}${input('Category','category',item?.category||'Team culture','text','required')}${input('Author','author',item?.author||'ACE Team','text')}${input('Date','date',item?.date||new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),'text')}${textarea('Short summary','excerpt',item?.excerpt)}${textarea('Article body','body',item?.body,'Leave a blank line between paragraphs.')}${publishingFields(item)}${imageFields('cover',item?.cover,'coverUpload','Cover image')}<div class="field"><label for="editor-galleryUploads">Add gallery images</label><input id="editor-galleryUploads" name="galleryUploads" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple><small>Each image is securely optimized before it is stored.</small></div><div class="field full"><label>Current gallery</label><div class="admin-gallery-manager">${currentGallery||'<p>No gallery images yet.</p>'}</div><small>Tick any picture you want removed, then save the post.</small></div></div>`;
    }
    if(type==='jobs')fields.innerHTML=`<div class="admin-editor-grid">${input('Job title','title',item?.title,'text','required')}${input('Department','department',item?.department,'text','required')}${select('Job group','category',item?.category||'operations',[['sales','Sales & Marketing'],['operations','Operations & People'],['tech','Creative & Tech']])}${input('Employment type','employmentType',item?.employmentType||'Full-time','text','required')}${input('Location','location',item?.location||'Santa Rosa, Laguna')}${select('Hiring priority','priority',item?.priority||'active',[['urgent','Urgent hiring: badly needed now'],['active','Actively hiring: current hiring focus'],['open','Accepting applications: lower priority']])}${select('Listing status','status',item?.status||'open',[['draft','Draft: visible only to administrators'],['open','Open: published on the careers page'],['closed','Closed: retained in admin but hidden publicly']])}${textarea('Role overview','summary',item?.summary,'A concise introduction shown when visitors select the role.')}${textarea('Responsibilities','responsibilities',(item?.responsibilities||[]).join('\n'),'Enter one responsibility per line.')}${textarea('Qualifications','qualifications',(item?.qualifications||[]).join('\n'),'Enter one qualification per line.')}</div>`;
    editor.showModal();
  };
  const upload=async(file,category,data,altText)=>ACECMS.uploadImage(file,{category,altText,rightsStatus:data.get('rightsStatus')||'company_owned',rightsNote:data.get('rightsNote')||'',sourceKind:'admin_upload'});
  const save=async()=>{await ACECMS.saveContent(content);render();setState('Changes saved. Refresh the public page to see them.')};
  const migration=document.querySelector('[data-admin-migration]'),needsMigration=()=>content.persistence?.source==='bundled';
  const updateMigrationState=()=>{
    const locked=needsMigration();
    migration.hidden=!locked;
    document.querySelectorAll('[data-admin-add],[data-admin-reset]').forEach(button=>{
      button.disabled=locked;
      button.title=locked?'Complete the one-time Supabase migration first.':'';
    });
    if(locked)setState('Complete the one-time image migration before editing website content.');
  };
  updateMigrationState();
  const fetchRepositoryFile=async source=>{const response=await fetch(new URL(source,document.baseURI));if(!response.ok)throw new Error(`Could not read ${source}.`);const blob=await response.blob();return new File([blob],source.split('/').pop()||'image',{type:blob.type||'image/png'})};
  const migrateRepositoryContent=async()=>{
    if(!document.querySelector('[data-migration-company-rights]').checked)throw new Error('Confirm the publishing rights for the current ACE photos first.');
    if(!document.querySelector('[data-migration-client-rights]').checked)throw new Error('Confirm the client testimonial and logo permissions first.');
    const migrated=structuredClone(content),cache=new Map(),uploaded=[];
    const migrate=async(source,category,altText,rightsStatus='company_owned')=>{
      if(!source)return null;const key=`${category}:${source}`;if(cache.has(key))return cache.get(key);
      setState(`Optimizing ${uploaded.length+1}: ${source.split('/').pop()}`);
      const file=await fetchRepositoryFile(source),asset=await ACECMS.uploadImage(file,{category,altText,rightsStatus,rightsNote:'Rights confirmed by an ACE administrator during repository migration.',sourceKind:'repository_migration',sourceReference:source});
      const check=await fetch(asset.url,{cache:'no-store'});if(!check.ok)throw new Error(`The uploaded image could not be verified: ${source}`);
      cache.set(key,asset);uploaded.push(asset);return asset;
    };
    for(const person of migrated.team){const asset=await migrate(person.image,'employee',`${person.name}, ${person.role}`);person.image=asset.url;person.imageMediaId=asset.id;person.status='published'}
    for(const story of migrated.testimonials){const asset=await migrate(story.logo,'testimonial',`${story.company} logo`,'client_permission');story.logo=asset.url;story.logoMediaId=asset.id;story.permissionConfirmed=true;story.permissionReference='Confirmed by an ACE administrator during repository migration.';story.status='published'}
    for(const blog of migrated.blogs){const originalCover=blog.cover,cover=await migrate(originalCover,'blog',blog.title);blog.cover=cover.url;blog.coverMediaId=cover.id;blog.gallery=[];blog.images=[];for(const source of (content.blogs.find(item=>item.id===blog.id)?.images||[])){const asset=await migrate(source,'blog',`${blog.title} gallery image`);blog.gallery.push({mediaId:asset.id,url:asset.url,caption:''});blog.images.push(asset.url)}blog.status='published'}
    delete migrated.persistence;
    content=await ACECMS.saveContent(migrated);
    updateMigrationState();render();setState(`${uploaded.length} optimized images migrated and verified. Repository originals were kept.`);
  };
  document.querySelector('[data-admin-migrate]').addEventListener('click',async event=>{event.currentTarget.disabled=true;try{await migrateRepositoryContent()}catch(error){alert(error.message);setState(error.message)}finally{event.currentTarget.disabled=false}});
  document.querySelectorAll('[data-admin-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-admin-tab]').forEach(item=>item.classList.toggle('active',item===button));document.querySelectorAll('[data-admin-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.adminPanel===button.dataset.adminTab))}));
  document.querySelectorAll('[data-admin-add]').forEach(button=>button.addEventListener('click',()=>{if(needsMigration()){alert('Complete the one-time image migration before adding content.');return}openEditor(button.dataset.adminAdd)}));
  document.addEventListener('click',async event=>{
    const card=event.target.closest('.admin-item');if(!card)return;
    if(needsMigration()){alert('Complete the one-time image migration before changing the current content.');return}
    const list=content[card.dataset.itemType],index=list.findIndex(item=>item.id===card.dataset.itemId);if(index<0)return;
    if(event.target.closest('[data-edit]'))openEditor(card.dataset.itemType,list[index]);
    if(event.target.closest('[data-remove]')&&confirm('Remove this item from the website?')){list.splice(index,1);await save()}
    const move=event.target.closest('[data-move]')?.dataset.move,target=move==='up'?index-1:move==='down'?index+1:index;if(target!==index&&target>=0&&target<list.length){[list[index],list[target]]=[list[target],list[index]];await save()}
  });
  editorForm.addEventListener('submit',async event=>{
    event.preventDefault();const submit=editorForm.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    try{const data=new FormData(editorForm),current=content[editType].find(item=>item.id===editId)||{},record={...current,id:current.id||ACECMS.uid(editType.slice(0,-1)||'item')};
    if(editType==='team'){record.name=data.get('name');record.role=data.get('role');record.quote=data.get('quote');record.status=data.get('status');const file=data.get('imageUpload');if(file?.size){const asset=await upload(file,'employee',data,`${record.name}, ${record.role}`);record.image=asset.url;record.imageMediaId=asset.id}}
    if(editType==='testimonials'){record.name=data.get('name');record.company=data.get('company');record.quote=data.get('quote');record.rating=Math.max(1,Math.min(5,Number(data.get('rating'))||5));record.status=data.get('status');record.permissionConfirmed=data.get('permissionConfirmed')==='on';record.permissionReference=data.get('permissionReference')||'';if(record.status==='published'&&!record.permissionConfirmed)throw new Error('Confirm client permission before publishing this testimonial.');const file=data.get('logoUpload');if(file?.size){const asset=await upload(file,'testimonial',data,`${record.company} logo`);record.logo=asset.url;record.logoMediaId=asset.id}}
    if(editType==='blogs'){record.title=data.get('title');record.category=data.get('category');record.author=data.get('author');record.date=data.get('date');record.excerpt=data.get('excerpt');record.body=data.get('body');record.status=data.get('status');const removed=new Set([...editorForm.querySelectorAll('[name="removeGallery"]:checked')].map(input=>Number(input.value)));record.images=(current.images||[]).filter((source,index)=>!removed.has(index));record.gallery=(current.gallery||[]).filter((_image,index)=>!removed.has(index));const cover=data.get('coverUpload');if(cover?.size){const asset=await upload(cover,'blog',data,record.title);record.cover=asset.url;record.coverMediaId=asset.id}const galleryFiles=[...editorForm.querySelector('[name="galleryUploads"]').files];for(const file of galleryFiles){const asset=await upload(file,'blog',data,`${record.title} gallery image`);record.images.push(asset.url);record.gallery.push({mediaId:asset.id,url:asset.url,caption:''})}if(!record.images.length&&record.cover)record.images=[record.cover]}
    if(editType==='jobs'){record.title=data.get('title');record.department=data.get('department');record.category=data.get('category');record.employmentType=data.get('employmentType');record.location=data.get('location');record.priority=data.get('priority');record.status=data.get('status');record.summary=data.get('summary');record.responsibilities=String(data.get('responsibilities')||'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean);record.qualifications=String(data.get('qualifications')||'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean)}
    const index=content[editType].findIndex(item=>item.id===record.id);if(index>=0)content[editType][index]=record;else content[editType].push(record);await save();editor.close();
    }catch(error){setState(error.message||'The change could not be saved.');alert(error.message||'The change could not be saved.')}finally{if(submit)submit.disabled=false}
  });
  document.querySelector('[data-editor-close]').addEventListener('click',()=>editor.close());document.querySelector('[data-editor-cancel]').addEventListener('click',()=>editor.close());
  document.querySelector('[data-admin-logout]').addEventListener('click',async()=>{await ACECMS.logout();window.location.replace('index.html')});
  document.querySelector('[data-admin-reset]').addEventListener('click',async()=>{if(needsMigration()){alert('Complete the one-time image migration first.');return}if(!confirm('Restore the original text and ordering while keeping the verified Supabase images?'))return;const restored=structuredClone(ACECMS.defaults);restored.team=restored.team.map(item=>({...item,...((({image,imageMediaId,status,publishedAt})=>({image,imageMediaId,status,publishedAt}))(content.team.find(saved=>saved.slug===item.id||saved.id===item.id)||{}))}));restored.testimonials=restored.testimonials.map(item=>({...item,...((({logo,logoMediaId,status,permissionConfirmed,permissionReference,publishedAt})=>({logo,logoMediaId,status,permissionConfirmed,permissionReference,publishedAt}))(content.testimonials.find(saved=>saved.id===item.id||saved.name===item.name)||{}))}));restored.blogs=restored.blogs.map(item=>({...item,...((({cover,coverMediaId,images,gallery,status,publishedAt})=>({cover,coverMediaId,images,gallery,status,publishedAt}))(content.blogs.find(saved=>saved.slug===item.id||saved.id===item.id)||{}))}));content=await ACECMS.saveContent(restored);render();setState('Original text restored. Verified images were kept.')});
  render();
});
