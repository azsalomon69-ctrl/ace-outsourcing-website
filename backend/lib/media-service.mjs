import { createHash, randomUUID } from 'node:crypto';
import Busboy from 'busboy';
import sharp from 'sharp';
import { assertSupabaseConfiguration, publicMediaUrl, storageBucket, supabase, unwrap } from './supabase.mjs';

const maxUploadBytes=Math.max(1024*1024,Math.min(30*1024*1024,Number(process.env.MAX_UPLOAD_BYTES)||15*1024*1024));
const configuredTarget=Math.max(40,Math.min(500,Number(process.env.IMAGE_TARGET_KB)||100));
const allowedCategories=new Set(['blog','employee','testimonial','job','site']);
const allowedRights=new Set(['company_owned','client_permission','licensed','third_party','unknown']);
const allowedSources=new Set(['repository_migration','admin_upload']);
const formatToMime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',heif:'image/avif'};
const profiles={
  employee:{width:800,height:800,targetKb:Math.max(60,configuredTarget),floor:74},
  testimonial:{width:500,height:500,targetKb:Math.min(100,configuredTarget),floor:76},
  blog:{width:1920,height:1920,targetKb:Math.max(100,configuredTarget),floor:72},
  job:{width:1600,height:1200,targetKb:Math.max(80,configuredTarget),floor:72},
  site:{width:1920,height:1440,targetKb:Math.max(120,configuredTarget),floor:72}
};
const storageFolders={blog:'blogs',employee:'employees',testimonial:'testimonials',job:'jobs',site:'site'};

function httpError(message,status=400){return Object.assign(new Error(message),{status})}

export function parseImageUpload(request){
  return new Promise((resolve,reject)=>{
    let parser;
    try{parser=Busboy({headers:request.headers,limits:{files:1,fields:10,fileSize:maxUploadBytes,parts:12}})}
    catch{reject(httpError('A multipart image upload is required.'));return}
    const fields={},chunks=[];
    let fileInfo=null,fileSize=0,fileLimit=false,settled=false;
    const fail=error=>{if(!settled){settled=true;reject(error)}};
    parser.on('field',(name,value)=>{fields[name]=String(value).slice(0,4000)});
    parser.on('file',(_name,stream,info)=>{
      if(fileInfo){stream.resume();fail(httpError('Only one image may be uploaded at a time.'));return}
      fileInfo=info;
      stream.on('limit',()=>{fileLimit=true});
      stream.on('data',chunk=>{fileSize+=chunk.length;chunks.push(chunk)});
      stream.on('error',fail);
    });
    parser.on('filesLimit',()=>fail(httpError('Only one image may be uploaded at a time.')));
    parser.on('error',error=>fail(httpError(`The upload could not be read: ${error.message}`)));
    parser.on('finish',()=>{
      if(settled)return;
      if(!fileInfo||!fileSize){fail(httpError('Select an image to upload.'));return}
      if(fileLimit||fileSize>maxUploadBytes){fail(httpError(`The original image exceeds the ${Math.round(maxUploadBytes/1024/1024)} MB upload limit.`,413));return}
      settled=true;resolve({buffer:Buffer.concat(chunks),filename:fileInfo.filename||'image',declaredMime:fileInfo.mimeType||'',fields});
    });
    request.pipe(parser);
  });
}

async function encodeWebp(image,profile){
  const targetBytes=profile.targetKb*1024;
  let quality=86,output,encodedQuality=quality;
  while(quality>=profile.floor){
    encodedQuality=quality;
    output=await image.clone().webp({quality:encodedQuality,alphaQuality:90,effort:5,smartSubsample:true}).toBuffer();
    if(output.length<=targetBytes*1.2||encodedQuality===profile.floor)break;
    quality=Math.max(profile.floor,quality-4);
  }
  return {buffer:output,quality:encodedQuality,targetBytes};
}

export async function optimizeImage(buffer,category){
  if(!allowedCategories.has(category))throw httpError('Invalid image category.');
  const profile=profiles[category];
  let sourceMetadata;
  try{sourceMetadata=await sharp(buffer,{failOn:'error',limitInputPixels:40_000_000,animated:false}).metadata()}
  catch{throw httpError('The selected file is not a valid supported image.')}
  if(!formatToMime[sourceMetadata.format])throw httpError('Only JPEG, PNG, WebP, and AVIF images are supported.');
  if((sourceMetadata.pages||1)>1)throw httpError('Animated images are not supported by this upload form.');
  const image=sharp(buffer,{failOn:'error',limitInputPixels:40_000_000,animated:false})
    .rotate()
    .resize({width:profile.width,height:profile.height,fit:'inside',withoutEnlargement:true})
    .removeAlpha();
  // Preserve transparency when the source actually contains an alpha channel.
  const pipeline=sourceMetadata.hasAlpha?sharp(buffer,{failOn:'error',limitInputPixels:40_000_000,animated:false})
    .rotate().resize({width:profile.width,height:profile.height,fit:'inside',withoutEnlargement:true}):image;
  const encoded=await encodeWebp(pipeline,profile);
  let finalMetadata;
  try{finalMetadata=await sharp(encoded.buffer,{failOn:'error'}).metadata()}
  catch{throw httpError('The optimized image failed final validation.',500)}
  if(!finalMetadata.width||!finalMetadata.height||finalMetadata.format!=='webp')throw httpError('The optimized image failed final validation.',500);
  return {
    buffer:encoded.buffer,
    mimeType:'image/webp',
    extension:'webp',
    width:finalMetadata.width,
    height:finalMetadata.height,
    byteSize:encoded.buffer.length,
    quality:encoded.quality,
    targetBytes:encoded.targetBytes,
    source:{format:sourceMetadata.format,width:sourceMetadata.width||0,height:sourceMetadata.height||0,byteSize:buffer.length}
  };
}

export async function storeImage({buffer,filename,declaredMime,fields}){
  assertSupabaseConfiguration();
  const category=String(fields.category||'').trim();
  if(!allowedCategories.has(category))throw httpError('Choose a valid image category.');
  const rightsStatus=allowedRights.has(fields.rightsStatus)?fields.rightsStatus:'unknown';
  const sourceKind=allowedSources.has(fields.sourceKind)?fields.sourceKind:'admin_upload';
  if(rightsStatus==='unknown')throw httpError('Confirm the image publishing rights before uploading.');
  const optimized=await optimizeImage(buffer,category);
  const detectedMime=formatToMime[optimized.source.format];
  if(!detectedMime||declaredMime!==detectedMime)throw httpError('The uploaded file type does not match its image contents.');
  const sha256=createHash('sha256').update(optimized.buffer).digest('hex');
  const duplicate=unwrap(await supabase.from('media_assets').select('*').eq('sha256',sha256).eq('category',category).maybeSingle(),'Duplicate media check');
  if(duplicate)return {...duplicate,url:publicMediaUrl(duplicate),optimization:{reused:true,quality:optimized.quality,targetBytes:optimized.targetBytes,source:optimized.source}};
  const now=new Date(),id=randomUUID();
  const storagePath=`${storageFolders[category]}/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${id}.${optimized.extension}`;
  unwrap(await supabase.storage.from(storageBucket).upload(storagePath,optimized.buffer,{
    contentType:optimized.mimeType,cacheControl:'31536000',upsert:false
  }),'Storage upload');
  const record={
    id,bucket_name:storageBucket,storage_path:storagePath,
    original_filename:String(filename||'image').slice(0,255),mime_type:optimized.mimeType,
    width:optimized.width,height:optimized.height,byte_size:optimized.byteSize,category,
    alt_text:String(fields.altText||'').trim().slice(0,500),source_kind:sourceKind,
    source_reference:String(fields.sourceReference||'').trim().slice(0,1000)||null,
    sha256,rights_status:rightsStatus,
    rights_note:String(fields.rightsNote||'').trim().slice(0,2000)||null
  };
  try{
    const asset=unwrap(await supabase.from('media_assets').insert(record).select('*').single(),'Media metadata insert');
    return {...asset,url:publicMediaUrl(asset),optimization:{quality:optimized.quality,targetBytes:optimized.targetBytes,source:optimized.source}};
  }catch(error){
    await supabase.storage.from(storageBucket).remove([storagePath]).catch(()=>{});
    throw error;
  }
}

async function referenceCount(id){
  const checks=[['blogs','cover_media_id'],['blog_images','media_asset_id'],['employees','portrait_media_id'],['testimonials','logo_media_id'],['jobs','image_media_id']];
  let total=0;
  for(const [table,column] of checks){
    const result=await supabase.from(table).select('id',{count:'exact',head:true}).eq(column,id);
    if(result.error)unwrap(result,`Reference check for ${table}`);
    total+=result.count||0;
  }
  return total;
}

export async function deleteStoredImage(id){
  assertSupabaseConfiguration();
  const asset=unwrap(await supabase.from('media_assets').select('*').eq('id',id).maybeSingle(),'Media lookup');
  if(!asset)throw httpError('Image not found.',404);
  if(await referenceCount(id))throw httpError('This image is still used by website content. Replace or detach it before deletion.',409);
  unwrap(await supabase.storage.from(asset.bucket_name).remove([asset.storage_path]),'Storage deletion');
  unwrap(await supabase.from('media_assets').delete().eq('id',id),'Media metadata deletion');
  return {deleted:true,id};
}

export const mediaUploadLimit=maxUploadBytes;
