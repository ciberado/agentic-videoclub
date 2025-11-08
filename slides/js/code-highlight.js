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

  // Add hook to highlight content wrapped in French quotation marks
  Prism.hooks.add('after-highlight', function (env) {
    // Pattern to match content between French quotation marks in the highlighted HTML
    const pattern = /«([^»]+)»/g;
    let counter = 0;

    // Replace matches with span elements in the final HTML, adding a counter
    env.element.innerHTML = env.element.innerHTML.replace(pattern, function (match, content) {
      counter++;
      return `<span class="snippet snippet-${counter}">${content}</span>`;
    });
  });

  Prism.highlightAll();
});
