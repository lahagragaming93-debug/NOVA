/* ============================================================
   NOVA — Module d'export partagé (PDF / PNG / Backup JSON)
   Utilisé par tous les documents NOVA
   ============================================================ */

(function (window) {
  'use strict';

  const NovaExport = {
    /**
     * Exporte le document en PDF directement (sans dialogue d'impression).
     * Utilise html2canvas + jsPDF.
     * @param {string} filename - nom du fichier sans extension
     */
    toPDF: async function (filename) {
      if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert("Librairies html2canvas ou jsPDF non chargées. Vérifie ta connexion internet.");
        return;
      }
      const { jsPDF } = window.jspdf;
      const pages = document.querySelectorAll('.page');
      if (pages.length === 0) { alert("Aucune page à exporter."); return; }

      // Hide toolbar before capture
      document.querySelectorAll('.toolbar, .no-print').forEach(el => el.style.visibility = 'hidden');
      this._toast("Génération du PDF en cours…");

      try {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i], {
            scale: 2,
            backgroundColor: '#fbf9f3',
            useCORS: true,
            logging: false
          });
          const imgData = canvas.toDataURL('image/png');
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        }
        pdf.save(`${filename || 'NOVA-document'}.pdf`);
        this._toast("PDF téléchargé.");
      } catch (e) {
        console.error(e);
        alert("Erreur lors de l'export PDF : " + e.message);
      } finally {
        document.querySelectorAll('.toolbar, .no-print').forEach(el => el.style.visibility = '');
      }
    },

    /**
     * Exporte le document (ou un sélecteur précis) en PNG via html2canvas.
     * @param {string} selector - sélecteur CSS du conteneur à exporter (par défaut '.page' ou tous les '.page').
     * @param {string} filename - nom du fichier sans extension.
     */
    toPNG: async function (selector, filename) {
      if (typeof html2canvas === 'undefined') {
        alert("La librairie html2canvas n'est pas chargée. Vérifie ta connexion internet.");
        return;
      }

      const targets = selector
        ? document.querySelectorAll(selector)
        : document.querySelectorAll('.page');

      if (targets.length === 0) {
        alert("Aucun élément à exporter.");
        return;
      }

      // Hide toolbar before capture
      document.querySelectorAll('.toolbar, .no-print').forEach(el => el.style.visibility = 'hidden');

      try {
        for (let i = 0; i < targets.length; i++) {
          const canvas = await html2canvas(targets[i], {
            scale: 2,
            backgroundColor: '#fbf9f3',
            useCORS: true,
            logging: false
          });
          const link = document.createElement('a');
          const suffix = targets.length > 1 ? `-page${i + 1}` : '';
          link.download = `${filename || 'NOVA-document'}${suffix}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      } catch (e) {
        console.error(e);
        alert("Erreur lors de l'export PNG : " + e.message);
      } finally {
        document.querySelectorAll('.toolbar, .no-print').forEach(el => el.style.visibility = '');
      }
    },

    /**
     * Sauvegarde l'état des champs fillable en localStorage.
     * @param {string} key - clé unique (ex : 'nova-registre-2026-S19').
     */
    saveLocal: function (key) {
      const data = {
        inputs: {},
        contentEditables: {},
        savedAt: new Date().toISOString()
      };
      document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) {
          data.inputs[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        }
      });
      document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        if (el.id) {
          data.contentEditables[el.id] = el.innerHTML;
        }
      });
      localStorage.setItem(key, JSON.stringify(data));
      this._toast("Sauvegarde locale effectuée.");
    },

    /**
     * Recharge l'état depuis localStorage.
     */
    loadLocal: function (key) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        this._toast("Aucune sauvegarde locale trouvée.", true);
        return false;
      }
      const data = JSON.parse(raw);
      Object.entries(data.inputs || {}).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) {
          if (el.type === 'checkbox') el.checked = val;
          else el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      Object.entries(data.contentEditables || {}).forEach(([id, html]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
      });
      this._toast("Sauvegarde rechargée.");
      return true;
    },

    /**
     * Exporte les données du document en JSON (backup).
     */
    exportJSON: function (filename) {
      const data = { inputs: {}, contentEditables: {}, exportedAt: new Date().toISOString() };
      document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) data.inputs[el.id] = el.type === 'checkbox' ? el.checked : el.value;
      });
      document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        if (el.id) data.contentEditables[el.id] = el.innerHTML;
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename || 'NOVA-backup'}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },

    /**
     * Importe un fichier JSON (restauration).
     */
    importJSON: function (callback) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            Object.entries(data.inputs || {}).forEach(([id, val]) => {
              const el = document.getElementById(id);
              if (el) {
                if (el.type === 'checkbox') el.checked = val;
                else el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
            Object.entries(data.contentEditables || {}).forEach(([id, html]) => {
              const el = document.getElementById(id);
              if (el) el.innerHTML = html;
            });
            if (typeof callback === 'function') callback(data);
            NovaExport._toast("Données importées.");
          } catch (err) {
            alert("Fichier JSON invalide : " + err.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    /**
     * Petit toast en bas à droite.
     */
    _toast: function (msg, isError) {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${isError ? '#8b3a3a' : '#1f2d4a'};
        color: #fbf9f3; padding: 10px 16px; border-radius: 3px;
        font-family: 'EB Garamond', serif; font-size: 11pt;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25); z-index: 10000;
        opacity: 0; transition: opacity 0.25s;
      `;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.style.opacity = '1');
      setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 250);
      }, 2200);
    },

    /**
     * Formatte un nombre en monnaie.
     */
    fmt: function (n) {
      if (isNaN(n) || n === null) return '0,00 $';
      return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
    },

    /**
     * Calcule l'impôt selon le barème T.T.E. (Article 4-3.2).
     * @param {number} ca - chiffre d'affaires hebdo
     * @param {number} benefice - bénéfice de la semaine
     * @returns {{tranche: number, taux: number, impot: number}}
     */
    calcImpot: function (ca, benefice) {
      const brackets = [
        { max: 10000, taux: 0 },
        { max: 50000, taux: 0.10 },
        { max: 100000, taux: 0.19 },
        { max: 250000, taux: 0.28 },
        { max: 500000, taux: 0.36 },
        { max: Infinity, taux: 0.46 }
      ];
      let tranche = 0;
      for (let i = 0; i < brackets.length; i++) {
        if (ca <= brackets[i].max) { tranche = i; break; }
      }
      const taux = brackets[tranche].taux;
      const impot = benefice > 0 ? Math.round(benefice * taux * 100) / 100 : 0;
      return { tranche, taux, impot };
    }
  };

  window.NovaExport = NovaExport;
})(window);
