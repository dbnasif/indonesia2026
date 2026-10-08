// Configuración web de Firebase (Consola → Configuración del proyecto → Tus apps → SDK).
// Estos datos son públicos por diseño: lo que protege la información son las
// reglas de firestore.rules, que solo dejan entrar a los mails de abajo.
window.APP_CONFIG = {
  firebase: {
    apiKey: 'PEGAR',
    authDomain: 'PEGAR.firebaseapp.com',
    projectId: 'PEGAR',
    appId: 'PEGAR',
  },
  allowed: ['danii.nasif@gmail.com', 'augustotraghetti@gmail.com'],
};
