// Datos públicos del proyecto Supabase (Project Settings → API).
// La "anon key" está pensada para ir en el navegador: lo que protege los datos
// son las reglas (RLS) de supabase/schema.sql, que solo dejan entrar a estos mails.
window.APP_CONFIG = {
  url: 'PEGAR_PROJECT_URL',        // ej: https://abcdxyz.supabase.co
  anonKey: 'PEGAR_ANON_KEY',
  allowed: ['danii.nasif@gmail.com', 'augustotraghetti@gmail.com'],
};
