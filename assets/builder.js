/* Planning model inherited from the original configurator; not flight validation. */
const fields = ['frame', 'props', 'battery', 'sensors', 'ai'];
let group, renderer, scene, camera;
let currentBuild;
function selected(id) { return document.getElementById(id).selectedOptions[0]; }
function rebuild3D() {
  if (!group) return;
  while (group.children.length) {
    const mesh = group.children[0];
    mesh.geometry.dispose(); mesh.material.dispose(); group.remove(mesh);
  }
  const frame = selected('frame').dataset.type;
  function mesh(geometry, color, x, y, z, rotation = 0) {
    const item = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color }));
    item.position.set(x,y,z); item.rotation.y = rotation; group.add(item); return item;
  }
  mesh(new THREE.BoxGeometry(1.1, frame === 'enclosed' ? .6 : .25, .85), 0x40534a, 0,0,0);
  for (const [x,z] of [[.95,.95],[-.95,.95],[.95,-.95],[-.95,-.95]]) {
    mesh(new THREE.BoxGeometry(.12,.09,1.36),0x7b8e83,x/2,0,z/2,Math.atan2(x,z));
    mesh(new THREE.CylinderGeometry(.12,.12,.2,16),0xb9f27b,x,.09,z);
    mesh(new THREE.BoxGeometry(.8,.025,.10),selected('props').dataset.color,x,.23,z);
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
function update() {
  let weight = 20, base = 0;
  const values = {};
  for (const id of fields) {
    const option = selected(id); values[id] = option.value;
    weight += Number(option.dataset.w) || 0; base += Number(option.dataset.base) || 0;
    document.getElementById(id+'Info').textContent = option.dataset.info;
  }
  const usable = Number(selected('battery').dataset.wh)*.8;
  const power = weight/7 + Number(selected('ai').dataset.power);
  const minutes = Math.round(usable/power*60), cost = Math.round(base*1.3);
  document.getElementById('weight').textContent=weight+' g';
  document.getElementById('time').textContent=minutes+' min';
  document.getElementById('cost').textContent='$'+cost;
  document.getElementById('physicsNote').textContent=`Illustrative model: ${power.toFixed(1)} W hover; ${usable.toFixed(1)} Wh usable energy; 7 g/W assumed efficiency.`;
  const heavy = weight >= 250;
  const accelerator = ['hailo','coral'].includes(values.ai);
  document.getElementById('compatibility').textContent = 'Engineering review required. '+(heavy?'This concept exceeds 250 g in the planning model. ':'')+(accelerator?'Accelerator needs a compatible host, not included in this estimate. ':'')+'Motors, ESC, controller, radio, wiring, mounting and power-system compatibility are not validated.';
  document.querySelectorAll('.prop').forEach(el=>el.setAttribute('fill',selected('props').dataset.color));
  const hasAI = !['none','cloud','custom_sw'].includes(values.ai);
  for (const id of ['aiBox','aiLabel']) document.getElementById(id).classList.toggle('hidden',!hasAI);
  document.getElementById('sensor').classList.toggle('hidden',values.sensors==='none');
  document.getElementById('body').setAttribute('rx',selected('frame').dataset.type==='enclosed'?'28':'10');
  document.getElementById('body').setAttribute('stroke',selected('frame').dataset.type==='ducted'?'#b9f27b':'#7dd3c0');
  const notes = document.getElementById('notes').value;
  const brief = 'SILENTFORGE / CONCEPT BUILD BRIEF\n\n'+fields.map(id=>id.toUpperCase()+': '+selected(id).textContent.trim()).join('\n')+`\n\nIllustrative mass: ${weight} g\nModel hover estimate: ${minutes} min\nComponent allowance: $${cost} USD\n\nNotes: ${notes || 'None'}\n\nPlanning only. No compatibility approval or flight specification. Component allowances + 30% margin exclude labor, complete propulsion/control system, shipping and taxes. Written review and quote required. No order or payment created.`;
  currentBuild = {values,notes,brief};
  try {localStorage.setItem(BUILD_KEY,JSON.stringify(currentBuild));document.getElementById('save-status').textContent='Configuration saved in this browser.';}
  catch {document.getElementById('save-status').textContent='Browser storage is unavailable. Download your brief to keep it.';}
  rebuild3D();
}
const saved = getBuild();
if (saved) {
  for(const id of fields) if ([...document.getElementById(id).options].some(o=>o.value===saved.values?.[id])) document.getElementById(id).value=saved.values[id];
  if(typeof saved.notes==='string') document.getElementById('notes').value=saved.notes.slice(0,4000);
}
for(const id of [...fields,'notes']) document.getElementById(id).addEventListener(id==='notes'?'input':'change',update);
document.getElementById('download-build').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([currentBuild.brief],{type:'text/plain'}));
  const link=document.createElement('a'); link.href=url;link.download='silentforge-build-brief.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
init3D(); update();
