import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const frontend=resolve('..','frontend');
const defaults=JSON.parse(await readFile(resolve('data','default-content.json'),'utf8'));
const assets=new Map();
const add=(source,category,usage)=>{if(!source?.startsWith('assets/'))return;const current=assets.get(source)||{source,category,usage:[]};current.usage.push(usage);assets.set(source,current)};
defaults.team.forEach(item=>add(item.image,'employee',`employee:${item.id}`));
defaults.testimonials.forEach(item=>add(item.logo,'testimonial',`testimonial:${item.id}`));
defaults.blogs.forEach(item=>{add(item.cover,'blog',`blog-cover:${item.id}`);item.images.forEach(source=>add(source,'blog',`blog-gallery:${item.id}`))});

const rows=[];
for(const item of assets.values()){
  const optimizedPath=resolve(frontend,item.source),candidate=item.source.replace(/\.webp$/i,'.png'),candidatePath=resolve(frontend,candidate);
  let originalPath=optimizedPath;
  try{await access(candidatePath);originalPath=candidatePath}catch{}
  const original=await readFile(originalPath),optimizedFile=await readFile(optimizedPath),metadata=await sharp(original).metadata(),optimizedMetadata=await sharp(optimizedFile).metadata();
  rows.push({asset:item.source,usage:item.usage.join('|'),sourceFormat:metadata.format,sourceDimensions:`${metadata.width}x${metadata.height}`,sourceKb:Math.round(original.length/1024),optimizedFormat:optimizedMetadata.format,optimizedDimensions:`${optimizedMetadata.width}x${optimizedMetadata.height}`,optimizedKb:Math.round(optimizedFile.length/1024),reductionPercent:Math.round((1-optimizedFile.length/original.length)*100),exists:Boolean((await stat(optimizedPath)).isFile())});
}
rows.sort((a,b)=>b.sourceKb-a.sourceKb);
console.table(rows);
const originalBytes=rows.reduce((sum,row)=>sum+row.sourceKb*1024,0),optimizedBytes=rows.reduce((sum,row)=>sum+row.optimizedKb*1024,0);
console.log(JSON.stringify({relevantAssets:rows.length,sourceMB:Number((originalBytes/1048576).toFixed(2)),optimizedMB:Number((optimizedBytes/1048576).toFixed(2)),reductionPercent:Math.round((1-optimizedBytes/originalBytes)*100)},null,2));
