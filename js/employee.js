const db = window.cravingsDb;
const staffLogin = document.getElementById('staffLogin');
const staffApp = document.getElementById('staffApp');
const setupNotice = document.getElementById('setupNotice');
const staffMessage = document.getElementById('staffMessage');
const lookupMessage = document.getElementById('lookupMessage');
const customerResult = document.getElementById('customerResult');
let scanner = null;
let currentCode = null;

function note(target, text, type='info') { target.innerHTML = text ? `<div class="notice ${type}">${text}</div>` : ''; }

async function ensureStaff(session) {
  if (!session?.user) {
    staffLogin.classList.remove('hidden'); staffApp.classList.add('hidden'); return false;
  }
  const { data, error } = await db.from('profiles').select('role').eq('id', session.user.id).single();
  if (error || !['employee','admin'].includes(data?.role)) {
    await db.auth.signOut();
    note(staffMessage, 'Esta cuenta no tiene permiso de empleado.', 'error');
    staffLogin.classList.remove('hidden'); staffApp.classList.add('hidden'); return false;
  }
  staffLogin.classList.add('hidden'); staffApp.classList.remove('hidden');
  return true;
}

function extractCode(raw) {
  const text = String(raw || '').trim();
  const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return uuid ? uuid[0] : null;
}

async function lookup(code) {
  currentCode = code;
  note(lookupMessage, 'Buscando tarjeta…');
  const { data, error } = await db.rpc('lookup_customer', { p_public_code: code });
  if (error) {
    customerResult.classList.add('hidden');
    return note(lookupMessage, error.message || 'No pudimos leer la tarjeta.', 'error');
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    customerResult.classList.add('hidden');
    return note(lookupMessage, 'Tarjeta no encontrada.', 'error');
  }
  note(lookupMessage, '');
  document.getElementById('resultName').textContent = row.full_name || 'Cliente Cravings!';
  document.getElementById('resultProgress').textContent = `${row.stamps}/7`;
  document.getElementById('resultRewards').textContent = row.rewards_available;
  const hasReward = Number(row.rewards_available) > 0;
  document.getElementById('rewardPill').classList.toggle('hidden', !hasReward);
  document.getElementById('redeemReward').classList.toggle('hidden', !hasReward);
  document.getElementById('purchaseAmount').value = '';
  customerResult.classList.remove('hidden');
}

async function startScanner() {
  const wrap = document.getElementById('readerWrap');
  wrap.classList.remove('hidden');
  if (scanner) {
    try { await scanner.stop(); } catch (_) {}
  }
  scanner = new Html5Qrcode('reader');
  try {
    await scanner.start(
      { facingMode:'environment' },
      { fps:10, qrbox:{ width:240, height:240 } },
      async decodedText => {
        const code = extractCode(decodedText);
        if (!code) return note(lookupMessage, 'Ese QR no corresponde a una Tarjeta Cravings!', 'error');
        try { await scanner.stop(); } catch (_) {}
        wrap.classList.add('hidden');
        await lookup(code);
      },
      () => {}
    );
  } catch (err) {
    note(lookupMessage, 'No se pudo abrir la cámara. Revisa el permiso de cámara del navegador.', 'error');
  }
}

document.getElementById('staffLoginForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!db) return;
  note(staffMessage, 'Entrando…');
  const email = document.getElementById('staffEmail').value.trim();
  const password = document.getElementById('staffPassword').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) note(staffMessage, 'Correo o contraseña incorrectos.', 'error');
});

document.getElementById('startScanner').addEventListener('click', startScanner);
document.getElementById('scanAnother').addEventListener('click', () => {
  customerResult.classList.add('hidden'); currentCode = null; note(lookupMessage, ''); startScanner();
});

document.getElementById('registerPurchase').addEventListener('click', async () => {
  if (!currentCode) return;
  const amount = Number(document.getElementById('purchaseAmount').value);
  if (!Number.isFinite(amount) || amount < 50) return note(lookupMessage, 'La compra mínima para sumar un sello es de $50 MXN.', 'error');
  const btn = document.getElementById('registerPurchase'); btn.disabled = true;
  const { data, error } = await db.rpc('register_purchase', { p_public_code: currentCode, p_amount: amount });
  btn.disabled = false;
  if (error) return note(lookupMessage, error.message, 'error');
  note(lookupMessage, data?.reward_earned ? '🎉 Compra registrada. ¡Se desbloqueó una bebida gratis!' : '✓ Compra registrada y sello agregado.', 'success');
  await lookup(currentCode);
});

document.getElementById('redeemReward').addEventListener('click', async () => {
  if (!currentCode) return;
  if (!confirm('¿Confirmas que vas a entregar la bebida gratis ahora?')) return;
  const { error } = await db.rpc('redeem_reward', { p_public_code: currentCode });
  if (error) return note(lookupMessage, error.message, 'error');
  note(lookupMessage, '☕ Recompensa canjeada correctamente.', 'success');
  await lookup(currentCode);
});

document.getElementById('staffLogout').addEventListener('click', async () => db.auth.signOut());

(async function init() {
  if (!window.CRAVINGS_SUPABASE_READY || !db) { setupNotice.classList.remove('hidden'); return; }
  const { data } = await db.auth.getSession();
  const ok = await ensureStaff(data.session);
  if (ok) {
    const code = extractCode(new URLSearchParams(location.search).get('code'));
    if (code) lookup(code);
  }
  db.auth.onAuthStateChange((_event, session) => setTimeout(async () => {
    const allowed = await ensureStaff(session);
    if (allowed) {
      const code = extractCode(new URLSearchParams(location.search).get('code'));
      if (code) lookup(code);
    }
  }, 0));
})();
