/**
 * NOVA — Dialogs UI personnalisés
 * Remplace les confirm() / alert() / prompt() natifs du navigateur
 * par des modals stylés à la DA NOVA, retournant des Promises.
 *
 * Usage :
 *   import { confirmDialog, alertDialog, promptDialog } from './js/ui-dialog.js';
 *   const ok = await confirmDialog('Êtes-vous sûr ?');
 *   await alertDialog('Opération terminée.');
 *   const name = await promptDialog('Votre nom ?', 'Defaut');
 */

let dialogRoot = null;

function ensureRoot() {
  if (dialogRoot && document.body.contains(dialogRoot)) return dialogRoot;
  dialogRoot = document.createElement('div');
  dialogRoot.id = 'nova-dialog-root';
  document.body.appendChild(dialogRoot);
  return dialogRoot;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function buildOverlay({ icon, title, message, body, danger, cancelLabel, confirmLabel, type }) {
  const overlay = document.createElement('div');
  overlay.className = 'nova-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const iconHtml = icon ? `<div class="nova-dialog-icon ${danger ? 'danger' : ''}">${icon}</div>` : '';
  const messageHtml = message ? `<p class="nova-dialog-msg">${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : '';
  const bodyHtml = body || '';

  let actionsHtml;
  if (type === 'alert') {
    actionsHtml = `<button type="button" class="nova-dialog-btn confirm">${escapeHtml(confirmLabel || 'OK')}</button>`;
  } else if (type === 'prompt') {
    actionsHtml = `
      <button type="button" class="nova-dialog-btn cancel">${escapeHtml(cancelLabel || 'Annuler')}</button>
      <button type="button" class="nova-dialog-btn confirm">${escapeHtml(confirmLabel || 'Valider')}</button>`;
  } else {
    actionsHtml = `
      <button type="button" class="nova-dialog-btn cancel">${escapeHtml(cancelLabel || 'Annuler')}</button>
      <button type="button" class="nova-dialog-btn confirm ${danger ? 'danger' : ''}">${escapeHtml(confirmLabel || 'Confirmer')}</button>`;
  }

  overlay.innerHTML = `
    <div class="nova-dialog ${danger ? 'danger' : ''}" tabindex="-1">
      ${iconHtml}
      ${title ? `<h3 class="nova-dialog-title">${escapeHtml(title)}</h3>` : ''}
      ${messageHtml}
      ${bodyHtml}
      <div class="nova-dialog-actions">${actionsHtml}</div>
    </div>
  `;

  return overlay;
}

/**
 * Confirmation OUI/NON.
 * @param {string} message
 * @param {{ title?, danger?, cancelLabel?, confirmLabel? }} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog(message, options = {}) {
  return new Promise(resolve => {
    const root = ensureRoot();
    const overlay = buildOverlay({
      icon: options.icon || (options.danger ? '⚠' : '?'),
      title: options.title || 'Confirmation',
      message,
      danger: options.danger,
      cancelLabel: options.cancelLabel,
      confirmLabel: options.confirmLabel,
      type: 'confirm'
    });

    const cleanup = (result) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 180);
      resolve(result);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    };
    document.addEventListener('keydown', onKey);

    overlay.querySelector('.cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.confirm').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });

    root.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    setTimeout(() => overlay.querySelector('.confirm').focus(), 50);
  });
}

/**
 * Information (un seul bouton OK).
 * @param {string} message
 * @param {{ title?, confirmLabel?, type? }} options - type peut être 'info', 'success', 'error'
 * @returns {Promise<void>}
 */
export function alertDialog(message, options = {}) {
  return new Promise(resolve => {
    const root = ensureRoot();
    const iconMap = { error: '⚠', success: '✓', info: 'ℹ', warning: '⚠' };
    const overlay = buildOverlay({
      icon: options.icon || iconMap[options.type] || 'ℹ',
      title: options.title || (options.type === 'error' ? 'Erreur' : 'Information'),
      message,
      danger: options.type === 'error' || options.type === 'warning',
      confirmLabel: options.confirmLabel || 'OK',
      type: 'alert'
    });

    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 180);
      resolve();
    };

    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') cleanup();
    };
    document.addEventListener('keydown', onKey);

    overlay.querySelector('.confirm').addEventListener('click', cleanup);
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(); });

    root.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    setTimeout(() => overlay.querySelector('.confirm').focus(), 50);
  });
}

/**
 * Prompt utilisateur.
 * @param {string} message
 * @param {string} defaultValue
 * @param {{ title?, placeholder?, confirmLabel?, cancelLabel? }} options
 * @returns {Promise<string|null>}
 */
export function promptDialog(message, defaultValue = '', options = {}) {
  return new Promise(resolve => {
    const root = ensureRoot();
    const inputHtml = `<input type="text" class="nova-dialog-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(options.placeholder || '')}">`;
    const overlay = buildOverlay({
      icon: '✎',
      title: options.title || 'Saisie',
      message,
      body: inputHtml,
      cancelLabel: options.cancelLabel,
      confirmLabel: options.confirmLabel,
      type: 'prompt'
    });

    const cleanup = (result) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 180);
      resolve(result);
    };

    const input = overlay.querySelector('.nova-dialog-input');

    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(null);
      if (e.key === 'Enter' && document.activeElement === input) cleanup(input.value);
    };
    document.addEventListener('keydown', onKey);

    overlay.querySelector('.cancel').addEventListener('click', () => cleanup(null));
    overlay.querySelector('.confirm').addEventListener('click', () => cleanup(input.value));
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(null); });

    root.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    setTimeout(() => { input.focus(); input.select(); }, 50);
  });
}
