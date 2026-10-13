// Configuración web de Firebase (Consola → Configuración del proyecto → Tus apps → SDK).
// Estos datos son públicos por diseño: lo que protege la información son las
// reglas de firestore.rules, que solo dejan entrar a los mails de abajo.
window.APP_CONFIG = {
  firebase: {
    apiKey: 'AIzaSyDdCpy5hesvcxOcIYcfkFsjrJaVyyysUwI',
    authDomain: 'indonesia-2026-wallydani.firebaseapp.com',
    projectId: 'indonesia-2026-wallydani',
    storageBucket: 'indonesia-2026-wallydani.firebasestorage.app',
    messagingSenderId: '220025398177',
    appId: '1:220025398177:web:c4b35e71de3ed430b421e0',
  },
  allowed: ['danii.nasif@gmail.com', 'augustotraghetti@gmail.com'],
};
