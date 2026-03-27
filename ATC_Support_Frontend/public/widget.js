(function () {
  var currentScript = document.currentScript;

  if (!currentScript) {
    return;
  }

  var widgetKey = currentScript.getAttribute('data-widget-key');

  if (!widgetKey) {
    console.warn('[ATC Widget] Missing data-widget-key on embedded script tag.');
    return;
  }

  var widgetHostOrigin = new URL(currentScript.src, window.location.href).origin;
  var parentHostOrigin = window.location.origin;
  var instanceId = 'atc-widget-' + widgetKey;

  if (document.getElementById(instanceId)) {
    return;
  }

  var style = document.createElement('style');
  style.textContent = [
    '.atc-widget-launcher{position:fixed;right:24px;bottom:24px;z-index:2147483646;display:flex;align-items:center;justify-content:center;width:56px;height:56px;border:0;border-radius:999px;background:#ea580c;color:#fff;box-shadow:0 20px 45px rgba(15,23,42,.24);cursor:pointer;transition:transform .18s ease,background .18s ease;}',
    '.atc-widget-launcher:hover{background:#c2410c;}',
    '.atc-widget-launcher:active{transform:scale(.96);}',
    '.atc-widget-shell{position:fixed;right:24px;bottom:96px;z-index:2147483645;width:min(390px,calc(100vw - 24px));height:min(640px,calc(100dvh - 120px));border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.28);background:transparent;}',
    '.atc-widget-shell[hidden]{display:none !important;}',
    '.atc-widget-frame{width:100%;height:100%;border:0;background:transparent;}',
    '@media (max-width: 640px){.atc-widget-launcher{right:16px;bottom:16px;}.atc-widget-shell{right:8px;left:8px;bottom:84px;width:auto;height:calc(100dvh - 100px);border-radius:24px;}}',
  ].join('');
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = instanceId;

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'atc-widget-launcher';
  launcher.setAttribute('aria-label', 'Open Julia support widget');
  launcher.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 9h8M8 13h5m-7 7 2.5-3H18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2v3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var shell = document.createElement('div');
  shell.className = 'atc-widget-shell';
  shell.hidden = true;

  var frame = document.createElement('iframe');
  frame.className = 'atc-widget-frame';
  frame.title = 'Julia Support Widget';
  frame.src =
    widgetHostOrigin +
    '/widget-host?widgetKey=' +
    encodeURIComponent(widgetKey) +
    '&hostOrigin=' +
    encodeURIComponent(parentHostOrigin);

  shell.appendChild(frame);
  root.appendChild(shell);
  root.appendChild(launcher);
  document.body.appendChild(root);

  var openWidget = function () {
    shell.hidden = false;
  };

  var closeWidget = function () {
    shell.hidden = true;
  };

  launcher.addEventListener('click', function () {
    if (shell.hidden) {
      openWidget();
      return;
    }

    closeWidget();
  });

  window.addEventListener('message', function (event) {
    if (event.origin !== widgetHostOrigin || !event.data || event.data.type !== 'ATC_WIDGET_CLOSE') {
      return;
    }

    if (event.data.widgetKey && event.data.widgetKey !== widgetKey) {
      return;
    }

    closeWidget();
  });
})();
