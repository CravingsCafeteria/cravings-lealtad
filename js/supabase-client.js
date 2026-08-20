(function () {
  const cfg = window.CRAVINGS_CONFIG || {};
  const ready = cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY &&
    !cfg.SUPABASE_URL.includes('PEGA_AQUI') && !cfg.SUPABASE_PUBLISHABLE_KEY.includes('PEGA_AQUI');

  window.CRAVINGS_SUPABASE_READY = Boolean(ready);
  if (!ready) {
    window.cravingsDb = null;
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error('No se cargó supabase-js.');
    window.cravingsDb = null;
    return;
  }

  window.cravingsDb = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
})();
