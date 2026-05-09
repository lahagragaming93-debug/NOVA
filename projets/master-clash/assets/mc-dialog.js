/* ============================================================================
 * mc-dialog.js — Modales custom pour Master Clash
 * Remplace window.alert / window.confirm / window.prompt par des modales DOM
 * compatibles avec la tablette CEF FiveM (qui ignore les popups natifs).
 *
 * API publique :
 *   MC_DIALOG.alert(message, options?)         → Promise<void>
 *   MC_DIALOG.confirm(message, options?)       → Promise<boolean>
 *   MC_DIALOG.prompt(message, defaultValue?, options?) → Promise<string|null>
 *
 * options : { title, confirmLabel, cancelLabel, danger, icon }
 * ============================================================================ */
(function(){
  if (window.MC_DIALOG) return;

  var STYLE_ID = 'mc-dialog-style';
  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = ''
      + '.mcd-overlay{position:fixed;inset:0;background:rgba(10,14,26,0.78);display:flex;align-items:center;justify-content:center;z-index:99999;opacity:0;transition:opacity 0.18s;font-family:"Segoe UI",Tahoma,sans-serif;}'
      + '.mcd-overlay.open{opacity:1;}'
      + '.mcd-overlay.closing{opacity:0;}'
      + '.mcd-box{background:linear-gradient(180deg,#1a2034 0%,#0f1424 100%);color:#dce4f0;border:1px solid #00d4ff;border-radius:8px;box-shadow:0 18px 48px rgba(0,0,0,0.55),0 0 0 1px rgba(0,212,255,0.15);padding:26px 28px;min-width:320px;max-width:92vw;width:440px;transform:translateY(8px);transition:transform 0.2s;}'
      + '.mcd-overlay.open .mcd-box{transform:translateY(0);}'
      + '.mcd-box.danger{border-color:#f5c518;}'
      + '.mcd-icon{font-size:34px;line-height:1;margin-bottom:14px;color:#00d4ff;text-align:center;}'
      + '.mcd-box.danger .mcd-icon{color:#f5c518;}'
      + '.mcd-title{font-size:16px;font-weight:700;margin:0 0 10px 0;letter-spacing:0.5px;color:#fff;text-align:center;}'
      + '.mcd-msg{margin:0 0 18px 0;font-size:14px;line-height:1.55;color:#dce4f0;text-align:center;}'
      + '.mcd-input{width:100%;background:#0a0e1a;border:1px solid #2a3550;border-radius:4px;color:#fff;padding:10px 12px;font-size:14px;font-family:inherit;margin-bottom:16px;box-sizing:border-box;}'
      + '.mcd-input:focus{outline:none;border-color:#00d4ff;}'
      + '.mcd-actions{display:flex;gap:10px;justify-content:flex-end;}'
      + '.mcd-btn{background:transparent;color:#dce4f0;border:1px solid #2a3550;padding:8px 18px;border-radius:4px;font-size:13px;font-family:inherit;font-weight:600;cursor:pointer;letter-spacing:0.5px;transition:all 0.15s;}'
      + '.mcd-btn:hover{border-color:#00d4ff;color:#00d4ff;}'
      + '.mcd-btn.confirm{background:#00d4ff;color:#0a0e1a;border-color:#00d4ff;}'
      + '.mcd-btn.confirm:hover{background:#3de0ff;color:#0a0e1a;}'
      + '.mcd-btn.confirm.danger{background:#f5c518;color:#0a0e1a;border-color:#f5c518;}'
      + '.mcd-btn.confirm.danger:hover{background:#ffd942;}';
    document.head.appendChild(s);
  }

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function buildOverlay(opts){
    injectStyle();
    var overlay = document.createElement('div');
    overlay.className = 'mcd-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var iconHtml = opts.icon ? '<div class="mcd-icon">' + escapeHtml(opts.icon) + '</div>' : '';
    var titleHtml = opts.title ? '<h3 class="mcd-title">' + escapeHtml(opts.title) + '</h3>' : '';
    var msgHtml = opts.message ? '<p class="mcd-msg">' + escapeHtml(opts.message).replace(/\n/g,'<br>') + '</p>' : '';
    var bodyHtml = opts.body || '';

    var actions;
    if (opts.kind === 'alert'){
      actions = '<button type="button" class="mcd-btn confirm">' + escapeHtml(opts.confirmLabel || 'OK') + '</button>';
    } else if (opts.kind === 'prompt'){
      actions = '<button type="button" class="mcd-btn cancel">' + escapeHtml(opts.cancelLabel || 'Annuler') + '</button>'
              + '<button type="button" class="mcd-btn confirm">' + escapeHtml(opts.confirmLabel || 'Valider') + '</button>';
    } else {
      var dangerClass = opts.danger ? ' danger' : '';
      actions = '<button type="button" class="mcd-btn cancel">' + escapeHtml(opts.cancelLabel || 'Annuler') + '</button>'
              + '<button type="button" class="mcd-btn confirm' + dangerClass + '">' + escapeHtml(opts.confirmLabel || 'Confirmer') + '</button>';
    }

    overlay.innerHTML = '<div class="mcd-box' + (opts.danger ? ' danger' : '') + '" tabindex="-1">'
      + iconHtml + titleHtml + msgHtml + bodyHtml
      + '<div class="mcd-actions">' + actions + '</div>'
      + '</div>';
    return overlay;
  }

  function showAndResolve(overlay, onOpenFocus, attach){
    return new Promise(function(resolve){
      function cleanup(value){
        document.removeEventListener('keydown', onKey);
        overlay.classList.add('closing');
        setTimeout(function(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 180);
        resolve(value);
      }
      function onKey(e){ attach.onKey(e, cleanup); }
      document.addEventListener('keydown', onKey);

      attach.bind(overlay, cleanup);
      overlay.addEventListener('click', function(e){
        if (e.target === overlay) attach.onBackdrop(cleanup);
      });

      document.body.appendChild(overlay);
      requestAnimationFrame(function(){ overlay.classList.add('open'); });
      setTimeout(function(){ try { onOpenFocus(overlay); } catch(_){} }, 50);
    });
  }

  var MC_DIALOG = {
    alert: function(message, options){
      options = options || {};
      var iconMap = { error:'⚠', success:'✓', info:'ℹ', warning:'⚠' };
      var overlay = buildOverlay({
        kind: 'alert',
        icon: options.icon || iconMap[options.type] || 'ℹ',
        title: options.title || (options.type === 'error' ? 'Erreur' : 'Information'),
        message: message,
        confirmLabel: options.confirmLabel || 'OK',
        danger: options.type === 'error' || options.type === 'warning'
      });
      return showAndResolve(overlay,
        function(o){ o.querySelector('.confirm').focus(); },
        {
          bind: function(o, cleanup){ o.querySelector('.confirm').addEventListener('click', function(){ cleanup(); }); },
          onBackdrop: function(cleanup){ cleanup(); },
          onKey: function(e, cleanup){ if (e.key === 'Escape' || e.key === 'Enter') cleanup(); }
        }
      );
    },

    confirm: function(message, options){
      options = options || {};
      var overlay = buildOverlay({
        kind: 'confirm',
        icon: options.icon || (options.danger ? '⚠' : '?'),
        title: options.title || 'Confirmation',
        message: message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        danger: options.danger
      });
      return showAndResolve(overlay,
        function(o){ o.querySelector('.confirm').focus(); },
        {
          bind: function(o, cleanup){
            o.querySelector('.confirm').addEventListener('click', function(){ cleanup(true); });
            o.querySelector('.cancel').addEventListener('click', function(){ cleanup(false); });
          },
          onBackdrop: function(cleanup){ cleanup(false); },
          onKey: function(e, cleanup){
            if (e.key === 'Escape') cleanup(false);
            if (e.key === 'Enter') cleanup(true);
          }
        }
      );
    },

    prompt: function(message, defaultValue, options){
      options = options || {};
      var inputHtml = '<input type="text" class="mcd-input" value="' + escapeHtml(defaultValue || '') + '" placeholder="' + escapeHtml(options.placeholder || '') + '">';
      var overlay = buildOverlay({
        kind: 'prompt',
        icon: '✎',
        title: options.title || 'Saisie',
        message: message,
        body: inputHtml,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel
      });
      var input;
      return showAndResolve(overlay,
        function(o){ input = o.querySelector('.mcd-input'); input.focus(); input.select(); },
        {
          bind: function(o, cleanup){
            input = o.querySelector('.mcd-input');
            o.querySelector('.confirm').addEventListener('click', function(){ cleanup(input.value); });
            o.querySelector('.cancel').addEventListener('click', function(){ cleanup(null); });
          },
          onBackdrop: function(cleanup){ cleanup(null); },
          onKey: function(e, cleanup){
            if (e.key === 'Escape') cleanup(null);
            if (e.key === 'Enter' && document.activeElement === input) cleanup(input.value);
          }
        }
      );
    }
  };

  window.MC_DIALOG = MC_DIALOG;
  console.log('[MC_DIALOG] modales custom prêtes (CEF FiveM compatible)');
})();
