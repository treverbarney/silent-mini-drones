const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const M=require('../assets/model.js');
function browserFixture(stored){
  const nodes=new Map(), storage=new Map(), navigations=[];
  function element(id=''){
    const handlers={};
    const e={id,handlers,textContent:'',href:'',hidden:true,disabled:false,
      classList:{add(){e.hidden=true;},remove(){e.hidden=false;}},
      addEventListener(type,fn){handlers[type]=fn;},
      after(child){nodes.set(child.id,child);},remove(){nodes.delete(e.id);},click(){},
      reportValidity(){return true;}};
    if(id)nodes.set(id,e);return e;
  }
  for(const id of ['inquiry','brief','email-status','email-fallback','clear-build'])element(id);
  if(stored!==undefined)storage.set('silentforge.build.v2',JSON.stringify(stored));
  const formValues={name:'QA Tester',email:'qa@example.com',topic:'Build inquiry',message:'General question'};
  const context={DroneModel:M,console,Blob,URL,setTimeout:()=>{},
    window:{addEventListener(){},location:{assign(url){navigations.push(url);}}},
    document:{querySelector(){return null;},getElementById(id){return nodes.get(id)||null;},addEventListener(){},createElement(){return element();}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    FormData:class{get(key){return formValues[key];}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../assets/site.js'),'utf8'),context);
  return {nodes,storage,context,navigations,formValues,submit(){nodes.get('inquiry').handlers.submit({preventDefault(){},currentTarget:nodes.get('inquiry')});}};
}
test('stored totals and briefs are recomputed; invalid saved readings stay invalid',()=>{
  const f=browserFixture({values:M.defaults,measurements:{hoverWatts:20,reserve:20},notes:'My build',brief:'FAKE $1 PRICE'});
  const saved=f.context.getBuild();assert.equal(saved.result.totalCents,51740);assert.ok(!saved.brief.includes('FAKE'));assert.ok(saved.brief.includes('8.0 min'));
  f.storage.set('silentforge.build.v2',JSON.stringify({values:M.defaults,measurements:{reserve:''},notes:''}));
  assert.equal(f.context.getBuild().result.ready,false);
  f.storage.set('silentforge.build.v2','broken json');assert.equal(f.context.getBuild(),null);
  f.storage.set('silentforge.build.v2',JSON.stringify({values:{ai:'made-up'},notes:''}));assert.equal(f.context.getBuild(),null);
});
test('long inquiry is complete in download with bounded email link, no automatic message or navigation',()=>{
  const f=browserFixture({values:M.defaults,measurements:{},notes:'Custom mount & camera'});
  f.formValues.message='A long detailed requirement. '.repeat(130);f.submit();
  const link=f.nodes.get('email-fallback');assert.ok(link.href.length<1800);assert.match(decodeURIComponent(link.href),/attach the downloaded/);
  assert.match(f.nodes.get('email-status').textContent,/Nothing has been sent/);
  let captured;f.context.downloadText=(text,name)=>{captured={text,name};};f.nodes.get('download-inquiry').onclick();
  assert.equal(captured.name,'silentforge-inquiry.txt');assert.ok(captured.text.includes(f.formValues.message));assert.ok(captured.text.includes('Custom mount & camera'));assert.ok(captured.text.includes('$517.40'));
  assert.deepEqual(f.navigations,[]);
  f.nodes.get('inquiry').handlers.input();assert.equal(link.hidden,true);assert.equal(f.nodes.has('download-inquiry'),false);
});
test('short inquiry encoded correctly; validation and clear saved build behave',()=>{
  const f=browserFixture();f.formValues.message='Camera & CAD? <example>';f.submit();
  assert.match(decodeURIComponent(f.nodes.get('email-fallback').href),/Camera & CAD\? <example>/);
  f.nodes.get('clear-build').handlers.click();assert.equal(f.nodes.get('email-fallback').hidden,true);
  assert.match(f.nodes.get('brief').textContent,/No saved configuration/);
  const empty=browserFixture();empty.nodes.get('inquiry').reportValidity=()=>false;empty.submit();assert.equal(empty.nodes.get('email-fallback').href,'');
});
