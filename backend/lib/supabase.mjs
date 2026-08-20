import { createClient } from '@supabase/supabase-js';

const url=String(process.env.SUPABASE_URL||'').trim().replace(/\/$/,'');
const secretKey=String(process.env.SUPABASE_SECRET_KEY||'').trim();

export const storageBucket=String(process.env.SUPABASE_STORAGE_BUCKET||'site-media').trim()||'site-media';
export const supabaseConfigured=Boolean(url&&secretKey);

export const supabase=supabaseConfigured?createClient(url,secretKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{headers:{'X-Client-Info':'ace-render-cms/1.0'}}
}):null;

export function assertSupabaseConfiguration(){
  if(!supabaseConfigured){
    const error=new Error('Supabase persistence is not configured on the backend.');
    error.status=503;
    throw error;
  }
}

export function publicMediaUrl(asset){
  if(!asset?.storage_path)return '';
  const bucket=asset.bucket_name||storageBucket;
  return supabase.storage.from(bucket).getPublicUrl(asset.storage_path).data.publicUrl;
}

export function unwrap(result,context='Supabase request'){
  if(result.error){
    const error=new Error(`${context} failed: ${result.error.message}`);
    error.status=String(result.error.code||'').startsWith('22')?400:503;
    error.cause=result.error;
    throw error;
  }
  return result.data;
}
