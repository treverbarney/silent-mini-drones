/* Planning model inherited from the original configurator; not flight validation. */
const fields = DroneModel.keys;
const readingFields = Object.keys(DroneModel.limits);
let canPersist = false;
let group, renderer, scene, camera;
let currentBuild;
function selected(id) { return DroneModel.catalog.groups[id].options.find(o=>o.id===document.getElementById(id).value); }
function rebuild3D() {
  if (!group) return;
  while (group.children.length) {
    const mesh = group.children[0];
    mesh.geometry.dispose(); mesh.material.dispose(); group.remove(mesh);
  }
  const frame = selected('frame').type;
  function mesh(geometry, color, x, y, z, rotation = 0) {
    const item = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color }));
    item.position.set(x,y,z); item.rotation.y = rotation; group.add(item); return item;
  }
  mesh(new THREE.BoxGeometry(1.1, frame === 'enclosed' ? .6 : .25, .85), 0x40534a, 0,0,0);
  for (const [x,z] of [[.95,.95],[-.95,.95],[.95,-.95],[-.95,-.95]]) {
    mesh(new THREE.BoxGeometry(.12,.09,1.36),0x7b8e83,x/2,0,z/2,Math.atan2(x,z));
    mesh(new THREE.CylinderGeometry(.12,.12,.2,16),0xb9f27b,x,.09,z);
    mesh(new THREE.BoxGeometry(.8*selected('props').diameter/2,.025,.10),selected('props').color,x,.23,z);
    if (frame === 'ducted') {
      const ring = mesh(new THREE.TorusGeometry(.49,.045,8,40),0x9db496,x,.13,z);
      ring.rotation.x = Math.PI/2;
    }
  }
  if (!['none','cloud','custom_sw'].includes(document.getElementById('ai').value)) mesh(new THREE.BoxGeometry(.42,.17,.3),0xb9f27b,0,.3,0);
  if (document.getElementById('sensors').value !== 'none') mesh(new THREE.BoxGeometry(.3,.2,.18),0x819ba8,0,.14,.55);
  renderer.render(scene,camera);
}
function init3D() {
  const container = document.getElementById('canvas3d');
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45,container.clientWidth/280,.1,100);
    camera.position.set(3,3.5,4); camera.lookAt(0,0,0);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(container.clientWidth,280); renderer.setClearColor(0x0b1112);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('role','img');
    renderer.domElement.setAttribute('aria-label','Three-dimensional schematic of the selected drone concept');
    scene.add(new THREE.AmbientLight(0xffffff,.8));
    const light = new THREE.DirectionalLight(0xffffff,.9); light.position.set(3,8,4); scene.add(light);
    group = new THREE.Group(); scene.add(group); rebuild3D();
    const observer = new ResizeObserver(() => {
      camera.aspect=container.clientWidth/280; camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth,280); renderer.render(scene,camera);
    }); observer.observe(container);
  } catch {
    group = null;
    container.textContent='3D preview is unavailable in this browser. The top-view diagram and configuration still work.';
  }
}
function renderRows(result) {
  const table=document.getElementById('bill-of-materials');table.replaceChildren();
  for(const line of result.lines) {
    const row=document.createElement('tr');
    for(const value of [line.label,line.offboard?'—':String(line.grams),DroneModel.money(line.cents)]) {
      const cell=document.createElement('td');cell.textContent=value;row.appendChild(cell);
    }
    table.appendChild(row);
  }
  document.getElementById('parts-subtotal').textContent=DroneModel.money(result.partsCents);
  document.getElementById('margin-total').textContent=DroneModel.money(result.marginCents);
  document.getElementById('planning-total').textContent=DroneModel.money(result.totalCents);
}
function saveCurrent() {
  try {
    localStorage.setItem(BUILD_KEY,JSON.stringify({values:currentBuild.values,measurements:currentBuild.measurements,notes:currentBuild.notes}));
    canPersist=true; document.getElementById('save-status').textContent='Selections, notes and performance inputs saved in this browser.';
  } catch {
    canPersist=false;document.getElementById('save-status').textContent='Browser storage is unavailable. Download the brief and send it with a general inquiry; review handoff requires browser storage.';
  }
  document.getElementById('request-build').disabled=!currentBuild.result.ready || !canPersist;
}
function update() {
  const values=Object.fromEntries(fields.map(id=>[id,document.getElementById(id).value]));
  const readings=Object.fromEntries(readingFields.map(id=>[id,(document.getElementById(id).validity.badInput?'invalid':document.getElementById(id).value)]));
  const result=DroneModel.calculate(values,readings);
  const notes=document.getElementById('notes').value;
  currentBuild={values:result.values,measurements:readings,notes,result,brief:DroneModel.brief(result,notes)};
  for(const id of fields) {
    const opt=selected(id);
    document.getElementById(id+'Info').textContent=`${opt.offboard?'Ground equipment':opt.grams+' g onboard allowance'} · ${DroneModel.money(opt.cents)} allowance`+(id==='frame'?` · ${opt.payloadLimit} g payload planning envelope`:id==='battery'?` · ${(opt.cells*3.7).toFixed(1)} V nominal`:'');
  }
  document.getElementById('weight').textContent=result.massGrams.toFixed(1)+' g';
  document.getElementById('cost').textContent=DroneModel.money(result.totalCents);
  document.getElementById('energy').textContent=result.energyWh.toFixed(2)+' Wh';
  document.getElementById('time').textContent=result.ready && result.hoverMinutes!==null ? result.hoverMinutes.toFixed(1)+' min' : result.ready?'Needs data':'Resolve conflicts';
  document.getElementById('physicsNote').textContent=`Nominal ${result.nominalVolts.toFixed(1)} V × ${selected('battery').mah} mAh / 1000 = ${result.energyWh.toFixed(3)} Wh. Usable: ${result.usableWh?.toFixed(3) ?? 'unknown'} Wh with ${result.measurements.reserve ?? 'missing'}% reserve. No flight-time estimate without measured total hover power.`;
  document.getElementById('thrust-result').textContent=`Thrust-to-weight: ${result.thrustRatio===null?'needs matching test data':result.thrustRatio.toFixed(2)+' : 1 (user-entered data)'}`;
  document.getElementById('current-result').textContent=`Battery nominal continuous-current limit: ${result.maxBatteryAmps===null?'needs continuous C rating':result.maxBatteryAmps.toFixed(2)+' A'}; measured peak: ${result.measurements.peakAmps ?? 'not supplied'} A.`;
  const compat=document.getElementById('compatibility'); compat.replaceChildren();
  const heading=document.createElement('strong');heading.textContent=result.ready?'Planning checks passed — engineering review still required.':'Resolve these conflicts before requesting this build:';compat.appendChild(heading);
  const issues=document.createElement('ul');
  for(const error of result.errors) {const item=document.createElement('li');item.textContent=error;issues.appendChild(item);} compat.appendChild(issues);
  const warningList=document.getElementById('review-notes');warningList.replaceChildren();
  for(const warning of result.warnings) {const item=document.createElement('li');item.textContent=warning;warningList.appendChild(item);}
  renderRows(result);
  document.querySelectorAll('.prop').forEach(el=>{el.setAttribute('fill',selected('props').color);el.setAttribute('rx',selected('props').diameter===3?'42':'30');});
  const hasAI=!['none','cloud','custom_sw'].includes(values.ai);
  for(const id of ['aiBox','aiLabel']) document.getElementById(id).classList.toggle('hidden',!hasAI);
  document.getElementById('sensor').classList.toggle('hidden',values.sensors==='none');
  document.getElementById('body').setAttribute('rx',selected('frame').type==='enclosed'?'28':'10');
  document.getElementById('body').setAttribute('stroke',selected('frame').type==='ducted'?'#b9f27b':'#7dd3c0');
  saveCurrent();rebuild3D();
}
function clearPerformance() {
  for(const id of ['hoverWatts','thrustGrams','peakAmps','batteryC']) document.getElementById(id).value='';
}
function applyValues(values,measurements={},notes='') {
  for(const id of fields) document.getElementById(id).value=values[id]??DroneModel.defaults[id];
  for(const id of readingFields) document.getElementById(id).value=measurements[id]??(id==='reserve'?20:id==='extraGrams'?0:'');
  document.getElementById('notes').value=notes;
}
const saved=getBuild();
applyValues(saved?.values||DroneModel.defaults,saved?.measurements||{},saved?.notes||'');
for(const id of fields) document.getElementById(id).addEventListener('change',()=>{
  if(!['radio','charger'].includes(id)) { clearPerformance(); document.getElementById('action-status').textContent='Onboard configuration changed. Previous performance inputs were cleared; enter test data for the new configuration.'; }
  update();
});
for(const id of [...readingFields,'notes']) document.getElementById(id).addEventListener('input',()=>{
  if(id==='extraGrams')clearPerformance(); update();
});
document.getElementById('download-build').addEventListener('click',()=>downloadText(currentBuild.brief,'silentforge-build-brief.txt'));
document.getElementById('request-build').addEventListener('click',()=>{
  update();if(currentBuild.result.ready&&canPersist)window.location.assign('/review/');
});
document.getElementById('reset-build').addEventListener('click',()=>{
  applyValues(DroneModel.defaults);document.getElementById('action-status').textContent='Build reset to starter defaults. Notes and performance inputs cleared.';update();
});
const presets={micro:{...DroneModel.defaults},camera:{...DroneModel.defaults,sensors:'hd_cam',battery:'2s850'},custom:{...DroneModel.defaults,frame:'custom_3d',propulsion:'light_3s',props:'three_inch',battery:'3s450',electronics:'aio_3s',ai:'pi_zero'}};
for(const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click',()=>{
  const notes=document.getElementById('notes').value;applyValues(presets[button.dataset.preset],{},notes);document.getElementById('action-status').textContent='Preset applied. Performance inputs cleared; notes retained.';update();
});
document.getElementById('rotate-preview').addEventListener('click',()=>{
  if(group){group.rotation.y+=Math.PI/4;renderer.render(scene,camera);}
});
document.getElementById('reset-camera').addEventListener('click',()=>{
  if(group){group.rotation.y=0;renderer.render(scene,camera);}
});
init3D();
if(!group)for(const id of ['rotate-preview','reset-camera'])document.getElementById(id).disabled=true;
update();
