const isDemo = () => !location.hash || location.hash === '#entry';
const demo = isDemo();

// Reload only when switching applications so their DOM, listeners and state stay isolated.
window.addEventListener('hashchange', event => {
  if (isDemo() !== demo) {
    event.stopImmediatePropagation();
    location.reload();
  }
});

if (demo) {
  if (!location.hash) history.replaceState(null, '', '#entry');
  const response = await fetch('./demo.html');
  if (!response.ok) throw new Error('Unable to load the quick demo.');
  const page = new DOMParser().parseFromString(await response.text(), 'text/html');
  document.title = page.title;
  document.body.innerHTML = page.body.innerHTML;
  document.querySelector('.brand').href = '#entry';
}

const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = demo ? './demo.css' : './styles.css';
const stylesReady = new Promise((resolve, reject) => {
  stylesheet.onload = resolve;
  stylesheet.onerror = () => reject(new Error('Unable to load form styles.'));
});
document.head.append(stylesheet);
await stylesReady;
await import(demo ? './demo.js' : './app.js');
