const BUILD_KEY = 'silentforge.build.v2';
const menu = document.querySelector('.menu');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  document.querySelector('.nav-links').classList.toggle('open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { menu.click(); menu.focus(); }
});
function getBuild() {
  try {
    const raw = localStorage.getItem(BUILD_KEY) || localStorage.getItem('silentforge.build.v1');
    if (!raw || raw.length > 24000) return null;
    const stored = JSON.parse(raw);
    if (!stored || !stored.values || typeof stored.values !== 'object' || typeof stored.notes !== 'string') return null;
    const result = DroneModel.calculate(stored.values, stored.measurements || {});
    return {result,values:result.values,measurements:stored.measurements || {},notes:stored.notes.slice(0,4000),brief:DroneModel.brief(result,stored.notes)};
  } catch { return null; }
}
function downloadText(text, name) {
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download=name; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showBrief() {
  const build = getBuild(), target = document.getElementById('brief');
  if (target) target.textContent = build?.brief || 'No saved configuration. Start in the configurator or send a general inquiry.';
  const status = document.getElementById('review-status');
  if (status) {
    status.textContent = !build ? 'No saved build. Please return to the configurator.' : build.result.ready ? 'Planning checks passed. Engineering and hardware review are still required.' : 'Resolve configuration conflicts in the builder before continuing.';
    document.getElementById('continue-request').disabled = !build?.result.ready;
    document.getElementById('download-review').disabled = !build;
  }
}
showBrief();
function invalidateInquiry() {
  const link=document.getElementById('email-fallback');
  if(link){link.classList.add('hidden');link.href='mailto:trever@barneyglobal.com';}
  document.getElementById('download-inquiry')?.remove();
  const status=document.getElementById('email-status');
  if(status?.textContent) status.textContent='Details changed. Prepare the email again to use your current message and build.';
}
window.addEventListener('pageshow', showBrief);
window.addEventListener('storage', ()=>{showBrief();invalidateInquiry();});
document.getElementById('inquiry')?.addEventListener('input',invalidateInquiry);
document.getElementById('clear-build')?.addEventListener('click', () => {
  try { localStorage.removeItem(BUILD_KEY); localStorage.removeItem('silentforge.build.v1'); showBrief();invalidateInquiry(); }
  catch { document.getElementById('brief').textContent='Browser storage is unavailable.'; }
});
document.getElementById('download-review')?.addEventListener('click',()=>{
  const build=getBuild(); if(build) downloadText(build.brief,'silentforge-build-brief.txt');
});
document.getElementById('review-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const build=getBuild();
  if(!build?.result.ready) { showBrief();return; }
  if(event.currentTarget.reportValidity()) window.location.assign('/contact/');
});
document.getElementById('inquiry')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const full = `Name: ${data.get('name')}\nReply email: ${data.get('email')}\nTopic: ${data.get('topic')}\n\n${data.get('message')}\n\n${getBuild()?.brief || 'General inquiry — no saved configuration.'}`;
  const subject=encodeURIComponent('SilentForge — '+data.get('topic'));
  const completeHref=`mailto:trever@barneyglobal.com?subject=${subject}&body=${encodeURIComponent(full)}`;
  const long = completeHref.length > 1800;
  const summary=`SilentForge inquiry from ${data.get('name')}\nReply email: ${data.get('email')}\n\nPlease attach the downloaded silentforge-inquiry.txt file, which contains my full message and configuration. No order or payment is created.`;
  const fallback = document.getElementById('email-fallback');
  fallback.href = long ? `mailto:trever@barneyglobal.com?subject=${subject}&body=${encodeURIComponent(summary)}` : completeHref;
  fallback.classList.remove('hidden');
  let download = document.getElementById('download-inquiry');
  if(!download) {
    download=document.createElement('button'); download.id='download-inquiry';download.type='button';download.className='button secondary';download.textContent='Download full inquiry';
    document.getElementById('email-status').after(download);
  }
  download.onclick=()=>downloadText(full,'silentforge-inquiry.txt');
  document.getElementById('email-status').textContent = long ? 'Your full inquiry is ready. Download it and attach it to the short email draft below. Keeping the draft short avoids mail-app link limits. Nothing has been sent.' : 'Your draft is ready. Open the prepared email below, review it and send it in your mail app. Nothing has been sent.';
});
