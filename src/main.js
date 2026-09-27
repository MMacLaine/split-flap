// Boot. The page markup (index.html, or the maclaine.se copies generated from it)
// provides #sf with a stage and a canvas; everything else is built by App.
import { App } from './app.js';

const root = document.getElementById('sf');
window.splitFlap = new App(root);

// Offline support for boards left running on a wall. Registered only over https (or
// localhost) and only where the page names a worker, so a file:// copy still runs.
const sw = root.dataset.sw;
if (sw && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register(sw, root.dataset.swScope ? { scope: root.dataset.swScope } : undefined).catch(() => {});
}
