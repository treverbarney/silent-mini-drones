// Private Sites service token arrives on stdin only. Never persist or print it.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
const origin='https://silentforge-drones.treverbarney.chatgpt.site';
const root=resolve('dist');
if(process.stdin.isTTY){process.stdin.setRawMode(true);process.stderr.write('Ready for private Site read access on stdin (hidden).\n');}
process.stdin.setEncoding('utf8');
let input='';
const token=await new Promise((accept,reject)=>{
  process.stdin.on('data',chunk=>{
    input+=chunk;
    if(input.length>20000)reject(new Error('Input too large'));
    if(input.includes('\n')){
      if(process.stdin.isTTY)process.stdin.setRawMode(false);
      process.stdin.pause();
      try{accept(JSON.parse(input.trim()).token);}catch{reject(new Error('Invalid input'));}
    }
  });
});
if(typeof token!=='string'||!token)throw new Error('Missing private Site read access.');
const headers={'OAI-Sites-Authorization':'Bearer '+token};
async function read(path){
  const r=await fetch(origin+path,{headers,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`Live read failed: ${path} (${r.status})`);
  return r.text();
}
const pages=['/','/configure/','/review/','/contact/','/technology/','/about/','/how-it-works/','/faq/','/safety/','/privacy/','/terms/','/shipping-returns/'];
for(const path of pages){
  const [actual,expected]=await Promise.all([read(path),readFile(resolve(root,'.'+path,'index.html'),'utf8')]);
  const main=expected.match(/<main id="main">([\s\S]*?)<\/main>/)?.[1];
  if(!main||!actual.includes(main))throw new Error('Live page content mismatch: '+path);
}
const assets=['catalog.js','model.js','site.js','builder.js','style.css'];
const text={};
for(const name of assets){
  const [actual,expected]=await Promise.all([read('/assets/'+name),readFile(resolve(root,'assets',name),'utf8')]);
  if(actual!==expected)throw new Error('Live asset mismatch: '+name);
  text[name]=actual;
}
const context={};vm.createContext(context);vm.runInContext(text['catalog.js'],context);vm.runInContext(text['model.js'],context);
const r=context.DroneModel.calculate({}, {hoverWatts:20,reserve:20});
if(r.totalCents!==51740 || Math.abs(r.hoverMinutes-7.992)>1e-10)throw new Error('Deployed calculation mismatch.');
console.log('PASS: 12 live pages, 5 exact deployed assets and known deployed calculation match the build.');
