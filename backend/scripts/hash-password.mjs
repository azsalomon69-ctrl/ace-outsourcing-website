import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt=promisify(scryptCallback);

function hiddenQuestion(label){
  if(!process.stdin.isTTY)throw new Error('Run this command in an interactive terminal.');
  return new Promise((resolve,reject)=>{
    let value='';
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    const onData=character=>{
      if(character==='\u0003'){
        cleanup();
        reject(new Error('Cancelled.'));
        return;
      }
      if(character==='\r'||character==='\n'){
        cleanup();
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if(character==='\u0008'||character==='\u007f'){
        if(value){value=value.slice(0,-1);process.stdout.write('\b \b')}
        return;
      }
      value+=character;
      process.stdout.write('*');
    };
    const cleanup=()=>{process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause()};
    process.stdin.on('data',onData);
  });
}

try{
  const password=await hiddenQuestion('Admin password: ');
  const confirmation=await hiddenQuestion('Confirm password: ');
  if(password.length<12)throw new Error('Use at least 12 characters.');
  if(password!==confirmation)throw new Error('Passwords do not match.');
  const salt=randomBytes(16);
  const derived=await scrypt(password,salt,64);
  process.stdout.write(`\nCopy this value into Render as ADMIN_PASSWORD_HASH:\n\nscrypt$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}\n`);
}catch(error){
  process.stderr.write(`\n${error.message}\n`);
  process.exitCode=1;
}

