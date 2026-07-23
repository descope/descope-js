// Load .env file directly at runtime
(function loadEnv() {
  console.log('Loading .env file ...');
  window.ENV = {};
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/../.env', false);
    xhr.send();
    if (xhr.status === 200) {
      xhr.responseText.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || trimmed === '') return;
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length)
          window.ENV[key.trim()] = valueParts.join('=').trim();
      });
    } else {
      console.warn('failed to load .env file', xhr.status);
    }
  } catch (e) {
    console.warn('Could not load .env:', e.message);
  }
  console.log('Loaded .env:', window.ENV);
})();
