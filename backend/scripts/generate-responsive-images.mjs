import { mkdir, stat } from 'node:fs/promises';
import { dirname, extname, basename, resolve } from 'node:path';
import sharp from 'sharp';

const frontend=resolve('..','frontend');
const assets=resolve(frontend,'assets');
const profiles=[
  {file:'hero-headset.webp',widths:[768,1280],quality:82},
  {file:'team-journal-intro.webp',widths:[640,1024],quality:80},
  {file:'service-seat-lease.webp',widths:[480,768],quality:78},
  {file:'service-recruitment.webp',widths:[480,768],quality:78},
  {file:'service-talent-sourcing.webp',widths:[480,768],quality:78},
  {file:'christmas-01.webp',widths:[480,768],quality:78},
  {file:'black-valentines-01.webp',widths:[480,768],quality:78},
  {file:'dinner-night-out.webp',widths:[480,768],quality:78}
];

const output=[];
for(const profile of profiles){
  const input=resolve(assets,profile.file);
  const metadata=await sharp(input).metadata();
  for(const width of profile.widths){
    if(!metadata.width||width>=metadata.width)continue;
    const name=`${basename(profile.file,extname(profile.file))}-${width}w.webp`;
    const target=resolve(assets,'responsive',name);
    await mkdir(dirname(target),{recursive:true});
    await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:profile.quality,effort:5,smartSubsample:true}).toFile(target);
    const result=await stat(target);
    output.push({source:profile.file,variant:name,width,kiB:Math.round(result.size/1024)});
  }
}

console.table(output);
