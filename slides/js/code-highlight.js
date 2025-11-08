document.addEventListener('slideshowLoaded', async () => {
  function loadCSS(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = url;

      link.onload = () => {
        console.log(`Loaded: ${url}`);
        resolve(url);
      };

      link.onerror = () => {
        console.error(`Failed to load: ${url}`);
        reject(new Error(`Failed to load CSS: ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  await loadCSS('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css');
  await import('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js');
  await Promise.all([
    import('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js'),
    import('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-docker.min.js'),
    import('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-java.min.js'),
    import('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-yaml.min.js'),
  ]);

  Prism.highlightAll();
});
