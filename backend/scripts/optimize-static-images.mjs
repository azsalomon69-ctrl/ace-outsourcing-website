import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { optimizeImage } from '../lib/media-service.mjs';

const root=resolve('..'),frontend=resolve(root,'frontend');
const textFiles=['ace.css','ace.js','about.html','admin.html','blog.html','careers.html','cms.js','contact.html','index.html','login.html','privacy.html','services.html'].map(file=>resolve(frontend,file));
textFiles.push(resolve('data','default-content.json'));
const fileText=new Map();
const references=new Set();
for(const file of textFiles){
  const text=await readFile(file,'utf8');fileText.set(file,text);
  for(const match of text.matchAll(/assets\/[a-z0-9-]+\.(?:png|webp)/gi)){
    const source=match[0].replace(/\.webp$/i,'.png');
    if(source!=='assets/ACE.png')references.add(source);
  }
}
const categoryFor=source=>/assets\/team-(kristine|ash|rose|byron)\./.test(source)?'employee':/(be-there|figshelf|green-marketing)/.test(source)?'testimonial':/(recognition|valentines|christmas|dinner-night|team-journal)/.test(source)?'blog':'site';
const created=[];
for(const source of references){const input=resolve(frontend,source),output=resolve(dirname(input),`${basename(input,extname(input))}.webp`),original=await readFile(input),optimized=await optimizeImage(original,categoryFor(source));await writeFile(output,optimized.buffer);created.push({source,output:`assets/${basename(output)}`,beforeKb:Math.round(original.length/1024),afterKb:Math.round(optimized.byteSize/1024),dimensions:`${optimized.width}x${optimized.height}`,quality:optimized.quality})}
for(const [file,original] of fileText){let updated=original;for(const item of created)updated=updated.replaceAll(item.source,item.output);if(updated!==original)await writeFile(file,updated,'utf8')}
console.table(created.sort((a,b)=>b.beforeKb-a.beforeKb));
console.log(`Created ${created.length} optimized WebP assets. Original repository images were retained.`);
