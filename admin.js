const db = window.cravingsDb;
const setupNotice = document.getElementById('setupNotice');
const adminLogin = document.getElementById('adminLogin');
const adminApp = document.getElementById('adminApp');
const adminMessage = document.getElementById('adminMessage');
const roleMessage = document.getElementById('roleMessage');

function note(target, text, type='info') { target.innerHTML = text ? `<div class="notice ${type}">${text}</div>` : ''; }
function fmtDate(iso) { return new Intl.DateTimeFormat('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)); }

async function ensureAdmin(session) {
  if (!session?.user) { adminLogin.classList.remove('hidden'); adminApp.classList.add('hidden'); return false; }
  const { data, error } = await db.from('profiles').select('role').eq('id', session.user.id).single();
  if (error || data?.role !== 'admin') {
    await db.auth.signOut();
    note(adminMessage, 'Esta cuenta no es administradora.', 'error');
    return false;
  }
  adminLogin.classList.add('hidden'); adminApp.classList.remove('hidden');
  return true;
}

function drawRegistrationQr() {
  const target = document.getElementById('registrationQr'); target.innerHTML = '';
  const url = new URL('./', window.location.href).toString();
  new QRCode(target, { text:url, width:198, height:198, colorDark:'#191B20', colorLight:'#FFFFFF', correctLevel:QRCode.CorrectLevel.M });
  document.getElementById('registrationUrl').textContent = url;
}

async function loadAdmin() {
  const [customers, purchases, rewards, redeemed] = await Promise.all([
    db.from('profiles').select('*', { count:'exact', head:true }).eq('role','customer'),
    db.from('purchases').select('*', { count:'exact', head:true }),
    db.from('rewards').select('*', { count:'exact', head:true }),
    db.from('rewards').select('*', { count:'exact', head:true }).not('redeemed_at','is',null)
  ]);
  document.getElementById('mCustomers').textContent = customers.count ?? '—';
  document.getElementById('mPurchases').textContent = purchases.count ?? '—';
  document.getElementById('mEarned').textContent = rewards.count ?? '—';
  document.getElementById('mRedeemed').textContent = redeemed.count ?? '—';

  const { data } = await db.from('purchases').select('amount, created_at, customer_id').order('created_at', { ascending:false }).limit(12);
  const list = document.getElementById('recentPurchases'); list.innerHTML = '';
  if (!data?.length) list.innerHTML = '<li class="muted">Todavía no hay compras.</li>';
  else data.forEach(row => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${fmtDate(row.created_at)} · <span class="muted">${row.customer_id.slice(0,8)}…</span></span><strong>$${Number(row.amount).toFixed(2)}</strong>`;
    list.appendChild(li);
  });
  drawRegistrationQr();
}

document.getElementById('adminLoginForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!db) return;
  note(adminMessage, 'Entrando…');
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) note(adminMessage, 'Correo o contraseña incorrectos.', 'error');
});

document.getElementById('roleForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('roleEmail').value.trim();
  const role = document.getElementById('roleValue').value;
  const { error } = await db.rpc('admin_set_role', { p_email: email, p_role: role });
  if (error) return note(roleMessage, error.message, 'error');
  note(roleMessage, `✓ ${email} ahora tiene el rol “${role}”.`, 'success');
  e.target.reset();
});

document.getElementById('refreshAdmin').addEventListener('click', loadAdmin);
document.getElementById('adminLogout').addEventListener('click', () => db.auth.signOut());

(async function init() {
  if (!window.CRAVINGS_SUPABASE_READY || !db) { setupNotice.classList.remove('hidden'); return; }
  const { data } = await db.auth.getSession();
  if (await ensureAdmin(data.session)) loadAdmin();
  db.auth.onAuthStateChange((_event, session) => setTimeout(async () => { if (await ensureAdmin(session)) loadAdmin(); }, 0));
})();
