const BUILD_KEY = 'silentforge.build.v1';
const menu = document.querySelector('.menu');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  document.querySelector('.nav-links').classList.toggle('open', open);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    menu.click(); menu.focus();
  }
});
function getBuild() {
  try {
    const value = JSON.parse(localStorage.getItem(BUILD_KEY));
    return value && typeof value.brief === 'string' && value.brief.length <= 16000 ? value : null;
  } catch { return null; }
}
function showBrief() {
  const target = document.getElementById('brief');
  if (target) target.textContent = getBuild()?.brief || 'No saved configuration. You can still send a general inquiry.';
}
showBrief();
document.getElementById('clear-build')?.addEventListener('click', () => {
  try { localStorage.removeItem(BUILD_KEY); showBrief(); }
  catch { document.getElementById('brief').textContent = 'Browser storage is unavailable.'; }
});
document.getElementById('inquiry')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const body = `Name: ${data.get('name')}\nReply email: ${data.get('email')}\n\n${data.get('message')}\n\n${getBuild()?.brief || ''}`;
  const href = `mailto:trever@barneyglobal.com?subject=${encodeURIComponent('SilentForge — ' + data.get('topic'))}&body=${encodeURIComponent(body)}`;
  const fallback = document.getElementById('email-fallback');
  fallback.href = href; fallback.classList.remove('hidden');
  document.getElementById('email-status').textContent = 'Your email draft is ready. Review and send it in your mail app. If it did not open, use the link below or email Trever directly.';
  fallback.click();
});
