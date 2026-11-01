const {test} = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/model.js');
const close = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
test('known hand-calculated bill, battery energy, endurance, thrust and current',()=>{
  const r=M.calculate({}, {reserve:20,hoverWatts:20,thrustGrams:60,batteryC:50,peakAmps:20});
  assert.equal(r.massGrams,114);
  assert.equal(r.partsCents,39800);assert.equal(r.marginCents,11940);assert.equal(r.totalCents,51740);
  close(r.nominalVolts,7.4);close(r.energyWh,3.33);close(r.usableWh,2.664);close(r.hoverMinutes,7.992);
  close(r.thrustRatio,240/114);close(r.maxBatteryAmps,22.5);assert.equal(r.ready,true);
});
test('ground equipment affects cost, not aircraft mass; all four motors counted once',()=>{
  const base=M.calculate(), own=M.calculate({radio:'own',charger:'own'});
  assert.equal(base.massGrams,own.massGrams);assert.equal(base.partsCents-own.partsCents,16000);
  assert.equal(base.lines.find(x=>x.id==='micro_2s').grams,24);
  const loaded=M.calculate({}, {extraGrams:10});assert.equal(loaded.massGrams,base.massGrams+10);assert.equal(loaded.totalCents,base.totalCents);
});
test('correct energy for every battery, reserve boundaries, no invented performance',()=>{
  for(const [id,wh] of [['2s450',3.33],['2s850',6.29],['3s450',4.995]]) close(M.calculate({battery:id}).energyWh,wh);
  const r=M.calculate();assert.equal(r.hoverMinutes,null);assert.equal(r.thrustRatio,null);assert.equal(r.maxBatteryAmps,null);
  for(const reserve of [5,50])close(M.calculate({}, {reserve,hoverWatts:20}).hoverMinutes,3.33*(1-reserve/100)/20*60);
  assert.ok(!M.brief(r).includes('NaN'));assert.ok(M.brief(r).includes('unavailable'));
});
test('conflicts block review and identify the reason',()=>{
  const cases=[
    [{battery:'3s450'}, {}, 'voltage'],
    [{propulsion:'light_3s'}, {}, 'diameter'],
    [{props:'three_inch'}, {}, 'diameter'],
    [{ai:'orin_nano'}, {}, 'payload'],
    [{receiver:'custom_rx',radio:'include'}, {}, 'ELRS'],
    [{}, {thrustGrams:20}, 'thrust'],
    [{}, {batteryC:20,peakAmps:10}, 'current']
  ];
  for(const [v,m,text] of cases){const r=M.calculate(v,m);assert.equal(r.ready,false);assert.ok(r.errors.join(' ').toLowerCase().includes(text.toLowerCase()));}
  const custom=M.calculate({frame:'custom_3d',propulsion:'light_3s',props:'three_inch',battery:'3s450',electronics:'aio_3s',ai:'pi_zero'});
  assert.equal(custom.ready,true);
  assert.equal(M.calculate({}, {thrustGrams:28.5}).ready,false); // exactly 1:1 is blocked
});
test('bad numeric data never becomes infinity, negative endurance or an accepted request',()=>{
  for(const field of ['hoverWatts','thrustGrams','peakAmps','batteryC'])for(const value of [0,-1,Infinity,NaN,'abc',' ',true,{},[]]){
    const r=M.calculate({}, {[field]:value});assert.equal(r.ready,false,field+': '+String(value));
    assert.equal(r.measurements[field],null);
  }
  for(const reserve of ['',0,4,51,Infinity])assert.equal(M.calculate({}, {reserve}).ready,false);
  for(const extraGrams of ['',-1,2001])assert.equal(M.calculate({}, {extraGrams}).ready,false);
  assert.throws(()=>M.calculate({battery:'invented'}));assert.throws(()=>M.calculate(null));
});
test('compute includes host; payload and current threshold edge cases',()=>{
  const r=M.calculate({frame:'custom_3d',ai:'hailo'});
  assert.equal(r.lines.find(x=>x.id==='hailo').grams,110);
  assert.match(r.lines.find(x=>x.id==='hailo').label,/host/);
  assert.equal(M.calculate({}, {batteryC:50,peakAmps:22.5}).ready,true);
  assert.equal(M.calculate({}, {batteryC:50,peakAmps:22.50001}).ready,false);
  assert.equal(M.calculate({}, {extraGrams:30}).ready,true);
  assert.equal(M.calculate({}, {extraGrams:30.01}).ready,false);
});
test('every core option combination has finite totals, correct cent arithmetic and exact itemization',()=>{
  const keys=['frame','propulsion','props','battery','electronics','sensors','ai'];let checked=0;
  function walk(values,depth){
    if(depth<keys.length){const key=keys[depth];for(const o of M.catalog.groups[key].options)walk({...values,[key]:o.id},depth+1);return;}
    const r=M.calculate(values);
    assert.equal(r.massGrams,r.lines.reduce((n,l)=>n+(l.offboard?0:l.grams),0));
    assert.equal(r.partsCents,r.lines.reduce((n,l)=>n+l.cents,0));
    assert.equal(r.marginCents,Math.round(r.partsCents*3/10));assert.equal(r.totalCents,r.partsCents+r.marginCents);
    assert.ok(Number.isSafeInteger(r.totalCents));assert.ok(r.massGrams>0);assert.ok(Number.isFinite(r.energyWh));
    assert.equal(r.ready,r.errors.length===0);checked++;
  }
  walk({},0);assert.equal(checked,11520);
});
test('brief uses current calculation and preserves notes without executing or silently dropping them',()=>{
  const note='<img src=x onerror=alert(1)> & custom payload';
  const r=M.calculate({}, {hoverWatts:20,reserve:20});const b=M.brief(r,note);
  assert.ok(b.includes(note));assert.ok(b.includes('$517.40'));assert.ok(b.includes('8.0 min'));
  assert.ok(b.includes('not approved for flight'));assert.ok(b.includes('No payment'));
});
