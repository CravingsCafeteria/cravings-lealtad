const db = window.cravingsDb;
const setupNotice = document.getElementById('setupNotice');
const authView = document.getElementById('authView');
const cardView = document.getElementById('cardView');
const logoutBtn = document.getElementById('logoutBtn');
const authMessage = document.getElementById('authMessage');
let currentUser = null;
let realtimeChannel = null;

function showMessage(text, type = 'info') {
  authMessage.innerHTML = text ? `<div class="notice ${type}">${text}</div>` : '';
}

function setTab(tab) {
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  showMessage('');
}

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

function renderStamps(stamps, rewardAvailable) {
  const box = document.getElementById('stamps');
  box.innerHTML = '';
  const visibleFilled = rewardAvailable > 0 ? 7 : stamps;
  for (let i = 0; i < 7; i++) {
    const el = document.createElement('div');
    el.className = `stamp ${i < visibleFilled ? 'filled' : ''}`;
    el.textContent = i < visibleFilled ? '✓' : String(i + 1);
    box.appendChild(el);
  }
  document.getElementById('progressText').textContent = rewardAvailable > 0
    ? '7 de 7 · premio listo'
    : `${stamps} de 7 compras`;
  document.getElementById('rewardBanner').classList.toggle('hidden', rewardAvailable < 1);
}

function buildQr(publicCode) {
  const target = document.getElementById('customerQr');
  target.innerHTML = '';
  const scanUrl = new URL('empleado.html', window.location.href);
  scanUrl.searchParams.set('code', publicCode);
  new QRCode(target, {
    text: scanUrl.toString(),
    width: 198,
    height: 198,
    colorDark: '#191B20',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M
  });
  document.getElementById('publicCode').textContent = `ID: ${publicCode}`;
}

function fmtDate(iso) {
  return new Intl.DateTimeFormat('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(iso));
}

async function loadCard() {
  if (!db || !currentUser) return;
  const [{ data: profile, error: pErr }, { data: wallet, error: wErr }, { count: rewards, error: rErr }] = await Promise.all([
    db.from('profiles').select('full_name, public_code').eq('id', currentUser.id).single(),
    db.from('wallets').select('stamps').eq('customer_id', currentUser.id).single(),
    db.from('rewards').select('*', { count:'exact', head:true }).eq('customer_id', currentUser.id).is('redeemed_at', null)
  ]);

  if (pErr || wErr || rErr) {
    console.error(pErr || wErr || rErr);
    return;
  }

  document.getElementById('customerName').textContent = profile.full_name || 'Cliente Cravings!';
  renderStamps(wallet.stamps || 0, rewards || 0);
  buildQr(profile.public_code);

  const { data: purchases } = await db.from('purchases')
    .select('amount, created_at')
    .eq('customer_id', currentUser.id)
    .order('created_at', { ascending:false })
    .limit(8);

  const list = document.getElementById('historyList');
  list.innerHTML = '';
  if (!purchases || purchases.length === 0) {
    list.innerHTML = '<li class="muted">Aún no hay compras registradas.</li>';
  } else {
    purchases.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${fmtDate(item.created_at)}</span><strong>$${Number(item.amount).toFixed(2)} · +1</strong>`;
      list.appendChild(li);
    });
  }
}

function subscribeRealtime() {
  if (!db || !currentUser) return;
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db.channel(`card-${currentUser.id}`)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'wallets', filter:`customer_id=eq.${currentUser.id}` }, loadCard)
    .on('postgres_changes', { event:'*', schema:'public', table:'rewards', filter:`customer_id=eq.${currentUser.id}` }, loadCard)
    .subscribe();
}

async function renderSession(session) {
  currentUser = session?.user || null;
  const logged = Boolean(currentUser);
  authView.classList.toggle('hidden', logged);
  cardView.classList.toggle('hidden', !logged);
  logoutBtn.classList.toggle('hidden', !logged);
  if (logged) {
    await loadCard();
    subscribeRealtime();
  }
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) return;
  showMessage('Creando tu tarjeta…', 'info');
  const fullName = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) return showMessage(error.message, 'error');
  if (!data.session) {
    showMessage('Cuenta creada. Revisa tu correo para confirmar tu cuenta y después inicia sesión.', 'success');
    setTab('login');
  } else {
    showMessage('¡Tu tarjeta está lista!', 'success');
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) return;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) showMessage('No pudimos entrar. Revisa correo y contraseña.', 'error');
});

document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
  if (!db) return;

  const email = document.getElementById('loginEmail').value.trim();

  if (!email) {
    showMessage(
      'Escribe primero el correo electrónico con el que registraste tu tarjeta.',
      'error'
    );
    return;
  }

  showMessage('Enviando enlace de recuperación…', 'info');

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://cravingscafeteria.github.io/cravings-lealtad/reset-password.html'
  });

  if (error) {
    console.error(error);
    showMessage(
      'No pudimos enviar el correo de recuperación. Intenta nuevamente.',
      'error'
    );
    return;
  }

  showMessage(
    'Te enviamos un enlace para cambiar tu contraseña. Revisa tu correo y también la carpeta de spam.',
    'success'
  );
});

logoutBtn.addEventListener('click', async () => db && db.auth.signOut());
document.getElementById('refreshCardBtn').addEventListener('click', loadCard);
window.addEventListener('focus', () => currentUser && loadCard());

aSyncInit();
async function aSyncInit() {
  if (!window.CRAVINGS_SUPABASE_READY || !db) {
    setupNotice.classList.remove('hidden');
    return;
  }
  const { data } = await db.auth.getSession();
  await renderSession(data.session);
  db.auth.onAuthStateChange((_event, session) => setTimeout(() => renderSession(session), 0));
}
