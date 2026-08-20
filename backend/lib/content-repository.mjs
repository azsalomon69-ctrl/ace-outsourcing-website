import { assertSupabaseConfiguration, publicMediaUrl, supabase, unwrap } from './supabase.mjs';

const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const nowIso=()=>new Date().toISOString();
const slugify=value=>String(value||'item').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'item';
const categoryToDb={sales:'sales_marketing',operations:'operations_people',tech:'creative_tech'};
const categoryToUi={sales_marketing:'sales',operations_people:'operations',creative_tech:'tech'};
const tierToDb={urgent:'urgent',active:'active',open:'accepting'};
const tierToUi={urgent:'urgent',active:'active',accepting:'open'};

function queryData(result,context){return unwrap(result,context)||[]}
function contentBlocks(body){return String(body||'').split(/\n{2,}/).map(value=>value.trim()).filter(Boolean).map(text=>({type:'paragraph',text}))}
function blocksToBody(value){
  if(!Array.isArray(value))return '';
  return value.map(block=>typeof block==='string'?block:block&&typeof block==='object'?String(block.text||''):'').filter(Boolean).join('\n\n');
}
function formatDate(value){
  if(!value)return '';
  const date=new Date(value);if(Number.isNaN(date.valueOf()))return '';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'}).format(date);
}
function publishedAt(item,status,publishedValue='published'){
  if(status!==publishedValue)return item.publishedAt||null;
  const date=new Date(item.publishedAt||item.date||Date.now());
  return Number.isNaN(date.valueOf())?nowIso():date.toISOString();
}

export async function loadContentFromDatabase({includeUnpublished=false}={}){
  assertSupabaseConfiguration();
  let employeeQuery=supabase.from('employees').select('*').order('display_order').order('created_at');
  let testimonialQuery=supabase.from('testimonials').select('*').order('display_order').order('created_at');
  let blogQuery=supabase.from('blogs').select('*').order('published_at',{ascending:false}).order('created_at',{ascending:false});
  let jobQuery=supabase.from('jobs').select('*').order('display_order').order('created_at');
  if(!includeUnpublished){
    employeeQuery=employeeQuery.eq('status','published');
    testimonialQuery=testimonialQuery.eq('status','published').eq('permission_confirmed',true);
    blogQuery=blogQuery.eq('status','published');
    jobQuery=jobQuery.eq('status','open');
  }
  const [employeeResult,testimonialResult,blogResult,jobResult]=await Promise.all([employeeQuery,testimonialQuery,blogQuery,jobQuery]);
  const employees=queryData(employeeResult,'Employee query');
  const testimonials=queryData(testimonialResult,'Testimonial query');
  const blogs=queryData(blogResult,'Blog query');
  const jobs=queryData(jobResult,'Job query');
  const blogIds=blogs.map(item=>item.id);
  const gallery=blogIds.length?queryData(await supabase.from('blog_images').select('*').in('blog_id',blogIds).order('sort_order'),'Blog image query'):[];
  const mediaIds=new Set();
  employees.forEach(item=>item.portrait_media_id&&mediaIds.add(item.portrait_media_id));
  testimonials.forEach(item=>item.logo_media_id&&mediaIds.add(item.logo_media_id));
  blogs.forEach(item=>item.cover_media_id&&mediaIds.add(item.cover_media_id));
  jobs.forEach(item=>item.image_media_id&&mediaIds.add(item.image_media_id));
  gallery.forEach(item=>mediaIds.add(item.media_asset_id));
  const assets=mediaIds.size?queryData(await supabase.from('media_assets').select('*').in('id',[...mediaIds]),'Media asset query'):[];
  const media=new Map(assets.map(asset=>[asset.id,{...asset,url:publicMediaUrl(asset)}]));
  const galleries=new Map();
  gallery.forEach(item=>{const list=galleries.get(item.blog_id)||[];const asset=media.get(item.media_asset_id);if(asset)list.push({id:item.id,mediaId:item.media_asset_id,url:asset.url,caption:item.caption||'',sortOrder:item.sort_order,asset});galleries.set(item.blog_id,list)});
  return {
    team:employees.map(item=>({
      id:item.id,slug:item.slug,name:item.name,role:item.role_title,department:item.department||'',quote:item.quote,bio:item.bio||'',
      image:media.get(item.portrait_media_id)?.url||'',imageMediaId:item.portrait_media_id||null,
      displayOrder:item.display_order,status:item.status,publishedAt:item.published_at
    })),
    testimonials:testimonials.map(item=>({
      id:item.id,name:item.client_name,company:item.company_name,quote:item.quote,rating:Number(item.rating),
      logo:media.get(item.logo_media_id)?.url||'',logoMediaId:item.logo_media_id||null,displayOrder:item.display_order,
      status:item.status,permissionConfirmed:item.permission_confirmed,permissionReference:item.permission_reference||'',publishedAt:item.published_at
    })),
    blogs:blogs.map(item=>{
      const images=galleries.get(item.id)||[];
      return {id:item.id,slug:item.slug,title:item.title,category:item.category,author:item.author_name,date:formatDate(item.published_at),
        publishedAt:item.published_at,excerpt:item.excerpt,body:blocksToBody(item.content),cover:media.get(item.cover_media_id)?.url||'',
        coverMediaId:item.cover_media_id||null,images:images.map(image=>image.url),gallery:images,status:item.status};
    }),
    jobs:jobs.map(item=>({
      id:item.id,slug:item.slug,title:item.title,department:item.department,category:categoryToUi[item.category]||'operations',
      employmentType:item.employment_type,location:item.location,workSetup:item.work_setup,applicationUrl:item.application_url||'',priority:tierToUi[item.hiring_tier]||'open',
      summary:item.summary,description:item.description,responsibilities:item.responsibilities||[],qualifications:item.qualifications||[],
      image:media.get(item.image_media_id)?.url||'',imageMediaId:item.image_media_id||null,status:item.status,
      publishedAt:item.published_at,closesAt:item.closes_at,displayOrder:item.display_order
    })),
    persistence:{source:'supabase',empty:employees.length+testimonials.length+blogs.length+jobs.length===0}
  };
}

async function deleteAbsent(table,keptIds){
  const existing=queryData(await supabase.from(table).select('id'),`${table} identity query`);
  const keep=new Set(keptIds);
  for(const item of existing)if(!keep.has(item.id))unwrap(await supabase.from(table).delete().eq('id',item.id),`${table} deletion`);
}

async function saveEmployees(items){
  const kept=[];
  for(let index=0;index<items.length;index++){
    const item=items[index],status=['draft','published','archived'].includes(item.status)?item.status:(item.permissionConfirmed?'published':'draft');
    const row={slug:slugify(item.slug||item.id||item.name),name:item.name,role_title:item.role,department:item.department||null,
      quote:item.quote||'',bio:item.bio||null,portrait_media_id:item.imageMediaId||null,display_order:index,status,
      published_at:publishedAt(item,status)};
    if(uuidPattern.test(item.id||''))row.id=item.id;
    const saved=unwrap(await supabase.from('employees').upsert(row,{onConflict:'slug'}).select('id').single(),'Employee save');kept.push(saved.id);
  }
  await deleteAbsent('employees',kept);
}

async function saveTestimonials(items){
  const kept=[];
  for(let index=0;index<items.length;index++){
    const item=items[index],status=['draft','published','archived'].includes(item.status)?item.status:'published';
    const row={client_name:item.name,company_name:item.company,quote:item.quote,rating:item.rating,logo_media_id:item.logoMediaId||null,
      display_order:index,status,permission_confirmed:Boolean(item.permissionConfirmed),permission_reference:item.permissionReference||null,
      published_at:publishedAt(item,status)};
    let result;
    if(uuidPattern.test(item.id||''))result=await supabase.from('testimonials').upsert({...row,id:item.id}).select('id').single();
    else result=await supabase.from('testimonials').insert(row).select('id').single();
    kept.push(unwrap(result,'Testimonial save').id);
  }
  await deleteAbsent('testimonials',kept);
}

async function saveBlogs(items){
  const kept=[];
  for(const item of items){
    const status=['draft','published','archived'].includes(item.status)?item.status:'published';
    const row={slug:slugify(item.slug||item.id||item.title),title:item.title,category:item.category||'Team culture',excerpt:item.excerpt||'',
      content:contentBlocks(item.body),author_name:item.author||'ACE Team',cover_media_id:item.coverMediaId||null,status,
      published_at:publishedAt(item,status)};
    if(uuidPattern.test(item.id||''))row.id=item.id;
    const saved=unwrap(await supabase.from('blogs').upsert(row,{onConflict:'slug'}).select('id').single(),'Blog save');kept.push(saved.id);
    unwrap(await supabase.from('blog_images').delete().eq('blog_id',saved.id),'Blog gallery reset');
    const gallery=(item.gallery||[]).filter(image=>uuidPattern.test(image.mediaId||''));
    if(gallery.length)unwrap(await supabase.from('blog_images').insert(gallery.map((image,index)=>({blog_id:saved.id,media_asset_id:image.mediaId,caption:image.caption||null,sort_order:index}))),'Blog gallery save');
  }
  await deleteAbsent('blogs',kept);
}

async function saveJobs(items){
  const kept=[];
  for(let index=0;index<items.length;index++){
    const item=items[index],status=['draft','open','closed','archived'].includes(item.status)?item.status:'open';
    const row={slug:slugify(item.slug||item.id||item.title),title:item.title,category:categoryToDb[item.category]||'operations_people',
      department:item.department,employment_type:item.employmentType,location:item.location||'Santa Rosa, Laguna',
      work_setup:['onsite','hybrid','remote'].includes(item.workSetup)?item.workSetup:(/hybrid/i.test(item.location||'')?'hybrid':'onsite'),application_url:item.applicationUrl||null,
      summary:item.summary||'',description:item.description||item.summary||'',responsibilities:item.responsibilities||[],qualifications:item.qualifications||[],
      hiring_tier:tierToDb[item.priority]||'accepting',status,image_media_id:item.imageMediaId||null,published_at:publishedAt(item,status,'open'),
      closes_at:item.closesAt||null,display_order:index};
    if(uuidPattern.test(item.id||''))row.id=item.id;
    const saved=unwrap(await supabase.from('jobs').upsert(row,{onConflict:'slug'}).select('id').single(),'Job save');kept.push(saved.id);
  }
  await deleteAbsent('jobs',kept);
}

export async function replaceContentInDatabase(content){
  assertSupabaseConfiguration();
  await saveEmployees(content.team||[]);
  await saveTestimonials(content.testimonials||[]);
  await saveBlogs(content.blogs||[]);
  await saveJobs(content.jobs||[]);
  return loadContentFromDatabase({includeUnpublished:true});
}
