// ===========================================================
// ÉDITEUR DE TEMPLATE DE CONTRAT (sous-commit 6b)
// ===========================================================
// Ouvre depuis admin.html via ?id=<tplId> ou ?clone=<tplId> ou rien (création vierge)

(function(){
  // Vérifier que l'utilisateur est admin
  var u = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!u || !u.isAdmin){
    setTimeout(function(){
      mcAlert('🚫 Cette page est réservée à l\'administrateur.', { title: 'Accès refusé' }).then(function(){
        location.replace('index.html');
      });
    }, 100);
    return;
  }

  var params = new URLSearchParams(location.search);
  var editId = params.get('id');
  var cloneId = params.get('clone');
  var current = null;
  var isNew = !editId;

  if (editId){
    var existing = getTemplate(editId);
    if (!existing){ mcAlert('Template introuvable.').then(function(){ location.href='admin.html'; }); return; }
    current = JSON.parse(JSON.stringify(existing));
    document.getElementById('tpl-editor-mode').textContent = '— Modification';
  } else if (cloneId){
    var src = getTemplate(cloneId);
    if (src){
      current = JSON.parse(JSON.stringify(src));
      current.id = 'custom-' + Date.now();
      current.label = 'Copie de ' + current.label;
      current.ref = current.ref.replace(/-\d{4}$/, '-' + new Date().getFullYear()) + '-COPIE';
      document.getElementById('tpl-editor-mode').textContent = '— Duplication';
    }
  }
  if (!current){
    // Création vierge : on part d'un Esthétique simplifié comme base
    current = {
      id: 'custom-' + Date.now(),
      label: 'Nouveau contrat',
      icon: '📄',
      ref: 'MC-NEW-2026',
      sectorSubs: ['Secteur — Master Clash', 'État de San Andreas'],
      blocks: [
        { type: 'h3', text: 'Préambule' },
        { type: 'p', html: 'Le présent contrat est conclu entre l\'Organisation <strong>Master Clash</strong> et le Partenaire ci-après désigné.' },
        { type: 'h3', text: 'Identification du partenaire' },
        { type: 'fieldRow', fields: [
          { label: 'Nom de l\'enseigne', input: { type: 'text', placeholder: 'Nom de l\'enseigne' } },
          { label: 'Téléphone', input: { type: 'text', placeholder: 'Numéro de téléphone' } }
        ]},
        { type: 'h3', text: 'Article 1 — Engagements du Partenaire' },
        { type: 'p', text: 'À compléter…' },
        { type: 'h3', text: 'Article 2 — Contreparties' },
        { type: 'ul', items: ['Mention sur les supports', 'Visibilité événementielle'] }
      ],
      signature: { organizerLabel: 'Pour l\'Organisateur', partnerLabel: 'Pour le Partenaire' },
      footer: 'MASTER CLASH — Document officiel — État de San Andreas'
    };
    document.getElementById('tpl-editor-mode').textContent = '— Création';
  }

  // ===== Render preview =====
  function refreshPreview(){
    var doc = document.getElementById('tpl-preview-doc');
    doc.innerHTML = buildContractHTML(current);
  }

  // ===== Render form =====
  function renderForm(){
    var f = document.getElementById('tpl-editor-form');
    var html = '';

    // Métadonnées
    html += '<div class="tpl-section"><h3>📋 Métadonnées</h3>';
    html += '<label class="auth-label">Identifiant (id, non modifiable une fois créé)</label>';
    html += '<input type="text" class="auth-input" id="meta-id" ' + (isNew ? '' : 'disabled') + ' value="' + escAttr(current.id) + '">';
    html += '<label class="auth-label">Titre du contrat</label>';
    html += '<input type="text" class="auth-input" id="meta-label" value="' + escAttr(current.label) + '">';
    html += '<label class="auth-label">Icône (emoji)</label>';
    html += '<input type="text" class="auth-input" id="meta-icon" maxlength="3" value="' + escAttr(current.icon) + '" style="width:80px">';
    html += '<label class="auth-label">Référence</label>';
    html += '<input type="text" class="auth-input" id="meta-ref" value="' + escAttr(current.ref) + '">';
    html += '<label class="auth-label">Sous-titre 1 du header</label>';
    html += '<input type="text" class="auth-input" id="meta-sub1" value="' + escAttr((current.sectorSubs || [])[0] || '') + '">';
    html += '<label class="auth-label">Sous-titre 2 du header</label>';
    html += '<input type="text" class="auth-input" id="meta-sub2" value="' + escAttr((current.sectorSubs || [])[1] || '') + '">';
    html += '<label class="auth-label">Label "Pour l\'Organisateur" (à gauche)</label>';
    html += '<input type="text" class="auth-input" id="meta-orglabel" value="' + escAttr((current.signature || {}).organizerLabel || 'Pour l\'Organisateur') + '">';
    html += '<label class="auth-label">Label "Pour le Partenaire" (à droite)</label>';
    html += '<input type="text" class="auth-input" id="meta-partlabel" value="' + escAttr((current.signature || {}).partnerLabel || 'Pour le Partenaire') + '">';
    html += '<label class="auth-label">Footer (bas du contrat)</label>';
    html += '<input type="text" class="auth-input" id="meta-footer" value="' + escAttr(current.footer || '') + '">';
    html += '</div>';

    // Blocs
    html += '<div class="tpl-section"><h3>🧱 Blocs du contrat <span style="font-size:12px;color:#6a7a8a;font-weight:400">(' + current.blocks.length + ')</span></h3>';
    html += '<p style="font-size:12px;color:#aabbc8;margin-bottom:12px">Modifiez le contenu, réorganisez (↑↓), supprimez (🗑) ou ajoutez de nouveaux blocs.</p>';
    current.blocks.forEach(function(b, i){
      html += '<div class="tpl-block" data-idx="' + i + '">';
      html += '<div class="tpl-block-head">';
      html +=   '<strong>#' + (i+1) + ' — ' + b.type + '</strong>';
      html +=   (b.optional ? ' <span class="tpl-badge-opt">optionnel</span>' : '');
      html +=   '<div class="tpl-block-actions">';
      html +=     '<button class="tpl-mini-btn" onclick="window.moveBlockUp(' + i + ')" ' + (i === 0 ? 'disabled' : '') + ' title="Monter">↑</button>';
      html +=     '<button class="tpl-mini-btn" onclick="window.moveBlockDown(' + i + ')" ' + (i === current.blocks.length - 1 ? 'disabled' : '') + ' title="Descendre">↓</button>';
      html +=     '<button class="tpl-mini-btn" onclick="window.toggleBlockOptional(' + i + ')" title="' + (b.optional ? 'Marquer comme requis' : 'Marquer comme optionnel') + '">' + (b.optional ? '✓' : '?') + '</button>';
      html +=     '<button class="tpl-mini-btn tpl-mini-del" onclick="window.deleteBlock(' + i + ')" title="Supprimer ce bloc">🗑</button>';
      html +=   '</div>';
      html += '</div>';
      html += renderBlockEditor(b, i);
      html += '</div>';
    });
    // Bouton ajouter
    html += '<div class="tpl-add-block">';
    html += '  <select id="tpl-new-block-type" class="auth-input" style="display:inline-block;width:auto;margin-right:8px">';
    html += '    <option value="h3">📌 Titre de section (h3)</option>';
    html += '    <option value="h4">📍 Sous-titre (h4)</option>';
    html += '    <option value="p">📝 Paragraphe (p)</option>';
    html += '    <option value="fieldRow">📋 Ligne de champs (fieldRow)</option>';
    html += '    <option value="inlineP">✏️ Paragraphe avec champs intégrés (inlineP)</option>';
    html += '    <option value="ul">• Liste à puces (ul)</option>';
    html += '    <option value="checkboxes">☑ Cases à cocher</option>';
    html += '    <option value="textarea">📄 Zone de texte (textarea)</option>';
    html += '    <option value="fieldLabel">🏷 Label seul (fieldLabel)</option>';
    html += '  </select>';
    html += '  <button class="admin-btn" onclick="window.addBlock()">➕ Ajouter ce bloc</button>';
    html += '</div>';
    html += '</div>';

    f.innerHTML = html;

    // Attacher les events de mise à jour live
    attachFormHandlers();
  }

  function renderBlockEditor(b, i){
    var s = '';
    switch(b.type){
      case 'h3':
      case 'h4':
        s += '<label class="auth-label">Titre</label>';
        s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="text" value="' + escAttr(b.text || '') + '">';
        break;
      case 'p':
        s += '<label class="auth-label">Paragraphe (HTML autorisé : &lt;strong&gt;, &lt;em&gt;…)</label>';
        s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="html" rows="3" style="resize:vertical">' + escAttr(b.html || b.text || '') + '</textarea>';
        break;
      case 'fieldLabel':
        s += '<label class="auth-label">Texte du label</label>';
        s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="text" value="' + escAttr(b.text || '') + '">';
        break;
      case 'textarea':
        s += '<label class="auth-label">Placeholder du textarea</label>';
        s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="input.placeholder" value="' + escAttr((b.input || {}).placeholder || '') + '">';
        break;
      case 'fieldRow':
        s += '<label class="auth-label">Champs côte à côte</label>';
        (b.fields || []).forEach(function(f, j){
          s += '<div class="tpl-subblock">';
          s += '<label class="auth-label">Label du champ ' + (j+1) + '</label>';
          s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="fields.' + j + '.label" value="' + escAttr(f.label || '') + '">';
          s += '<label class="auth-label">Placeholder</label>';
          s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="fields.' + j + '.input.placeholder" value="' + escAttr((f.input || {}).placeholder || '') + '">';
          if (f.input && f.input.value !== undefined){
            s += '<label class="auth-label">Valeur par défaut</label>';
            s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="fields.' + j + '.input.value" value="' + escAttr(f.input.value) + '">';
          }
          s += '</div>';
        });
        break;
      case 'inlineP':
        s += '<label class="auth-label">Paragraphe avec champs intégrés</label>';
        (b.segments || []).forEach(function(seg, j){
          if (seg.kind === 'text'){
            s += '<label class="auth-label">Texte (' + (j+1) + ')</label>';
            s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.value" rows="2" style="resize:vertical">' + escAttr(seg.value || '') + '</textarea>';
          } else if (seg.kind === 'html'){
            s += '<label class="auth-label">HTML inline (' + (j+1) + ')</label>';
            s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.value" value="' + escAttr(seg.value || '') + '">';
          } else if (seg.kind === 'input'){
            var inp = seg.input || {};
            s += '<div class="tpl-subblock"><strong style="font-size:11px;color:#00d4ff;text-transform:uppercase;letter-spacing:1px">Input ' + (j+1) + ' (' + (inp.type || 'text') + ')</strong>';
            s += '<label class="auth-label">Placeholder</label>';
            s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.input.placeholder" value="' + escAttr(inp.placeholder || '') + '">';
            if (inp.value !== undefined){
              s += '<label class="auth-label">Valeur par défaut</label>';
              s += '<input type="text" class="auth-input tpl-input" data-idx="' + i + '" data-key="segments.' + j + '.input.value" value="' + escAttr(inp.value) + '">';
            }
            s += '</div>';
          }
        });
        break;
      case 'ul':
        s += '<label class="auth-label">Items de la liste (un par ligne, HTML autorisé)</label>';
        var lines = (b.items || []).map(function(it){
          if (typeof it === 'string') return it;
          if (it.html) return it.html + (it.input ? ' [INPUT]' : '');
          return JSON.stringify(it);
        }).join('\n');
        s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="ul.items" rows="' + Math.max(3, (b.items||[]).length) + '" style="resize:vertical">' + escAttr(lines) + '</textarea>';
        s += '<p style="font-size:11px;color:#6a7a8a;margin-top:4px">⚠ Si la liste contient des inputs inline, l\'édition fine sera disponible au prochain commit.</p>';
        break;
      case 'checkboxes':
        s += '<label class="auth-label">Cases à cocher (label par ligne, préfixe * pour cochée par défaut)</label>';
        var cbLines = (b.items || []).map(function(it){
          return (it.checked ? '* ' : '') + (it.label || '');
        }).join('\n');
        s += '<textarea class="auth-input tpl-input" data-idx="' + i + '" data-key="checkboxes.items" rows="' + Math.max(2, (b.items||[]).length) + '" style="resize:vertical">' + escAttr(cbLines) + '</textarea>';
        break;
      default:
        s += '<p style="font-size:11px;color:#aabbc8">Type "' + b.type + '" — édition non disponible pour ce type.</p>';
    }
    return s;
  }

  function attachFormHandlers(){
    document.querySelectorAll('.tpl-input').forEach(function(el){
      el.addEventListener('input', function(){
        var idx = parseInt(el.dataset.idx, 10);
        var key = el.dataset.key;
        var val = el.value;
        applyChange(idx, key, val);
        refreshPreview();
      });
    });
    // Métadonnées
    var bind = function(id, applyFn){
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function(){ applyFn(el.value); refreshPreview(); });
    };
    bind('meta-id', function(v){ if (isNew) current.id = v; });
    bind('meta-label', function(v){ current.label = v; });
    bind('meta-icon', function(v){ current.icon = v; });
    bind('meta-ref', function(v){ current.ref = v; });
    bind('meta-sub1', function(v){ current.sectorSubs[0] = v; });
    bind('meta-sub2', function(v){ current.sectorSubs[1] = v; });
    bind('meta-orglabel', function(v){ current.signature.organizerLabel = v; });
    bind('meta-partlabel', function(v){ current.signature.partnerLabel = v; });
    bind('meta-footer', function(v){ current.footer = v; });
  }

  function applyChange(idx, key, val){
    var b = current.blocks[idx];
    if (!b) return;
    if (key === 'text' || key === 'html'){
      b[key] = val;
      // Pour les paragraphes, si on a un html, on retire le text et vice-versa
      if (key === 'html' && b.text) delete b.text;
      if (key === 'text' && b.html) delete b.html;
    } else if (key.indexOf('input.') === 0){
      var sub = key.replace('input.', '');
      if (!b.input) b.input = {};
      b.input[sub] = val;
    } else if (key.indexOf('fields.') === 0){
      var parts = key.split('.');
      var fIdx = parseInt(parts[1], 10);
      var subKey = parts.slice(2).join('.');
      if (!b.fields[fIdx]) return;
      if (subKey === 'label') b.fields[fIdx].label = val;
      else if (subKey.indexOf('input.') === 0){
        if (!b.fields[fIdx].input) b.fields[fIdx].input = {};
        b.fields[fIdx].input[subKey.replace('input.', '')] = val;
      }
    } else if (key.indexOf('segments.') === 0){
      var sParts = key.split('.');
      var sIdx = parseInt(sParts[1], 10);
      var sKey = sParts.slice(2).join('.');
      if (!b.segments[sIdx]) return;
      if (sKey === 'value') b.segments[sIdx].value = val;
      else if (sKey.indexOf('input.') === 0){
        if (!b.segments[sIdx].input) b.segments[sIdx].input = {};
        b.segments[sIdx].input[sKey.replace('input.', '')] = val;
      }
    } else if (key === 'ul.items'){
      b.items = val.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
    } else if (key === 'checkboxes.items'){
      b.items = val.split('\n').map(function(l){
        l = l.trim();
        if (!l) return null;
        var checked = false;
        if (l.indexOf('*') === 0){ checked = true; l = l.substring(1).trim(); }
        return { label: l, checked: checked };
      }).filter(Boolean);
    }
  }

  function escAttr(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ===== Manipulation des blocs =====
  window.moveBlockUp = function(i){
    if (i <= 0 || i >= current.blocks.length) return;
    var tmp = current.blocks[i];
    current.blocks[i] = current.blocks[i-1];
    current.blocks[i-1] = tmp;
    renderForm();
    refreshPreview();
  };
  window.moveBlockDown = function(i){
    if (i < 0 || i >= current.blocks.length - 1) return;
    var tmp = current.blocks[i];
    current.blocks[i] = current.blocks[i+1];
    current.blocks[i+1] = tmp;
    renderForm();
    refreshPreview();
  };
  window.deleteBlock = function(i){
    if (i < 0 || i >= current.blocks.length) return;
    var b = current.blocks[i];
    var preview = (b.text || b.html || ('bloc ' + b.type)).slice(0, 60);
    mcConfirm('Supprimer ce bloc ?\n\n« ' + preview + '… »\n\nCette action est immédiate (mais pas encore sauvegardée).', { title: '🗑 Supprimer bloc', okText: 'Supprimer' }).then(function(ok){
      if (!ok) return;
      current.blocks.splice(i, 1);
      renderForm();
      refreshPreview();
    });
  };
  window.toggleBlockOptional = function(i){
    if (!current.blocks[i]) return;
    current.blocks[i].optional = !current.blocks[i].optional;
    // Propager le flag sur les inputs si besoin
    var b = current.blocks[i];
    if (b.optional){
      if (b.input) b.input.optional = true;
      if (b.fields) b.fields.forEach(function(f){ if (f.input) f.input.optional = true; });
      if (b.segments) b.segments.forEach(function(s){ if (s.input) s.input.optional = true; });
    } else {
      if (b.input) delete b.input.optional;
      if (b.fields) b.fields.forEach(function(f){ if (f.input) delete f.input.optional; });
      if (b.segments) b.segments.forEach(function(s){ if (s.input) delete s.input.optional; });
    }
    renderForm();
    refreshPreview();
  };
  window.addBlock = function(){
    var type = document.getElementById('tpl-new-block-type').value;
    var newBlock = createNewBlock(type);
    if (!newBlock) return;
    current.blocks.push(newBlock);
    renderForm();
    refreshPreview();
    // Scroll vers le nouveau bloc
    setTimeout(function(){
      var blocks = document.querySelectorAll('.tpl-block');
      if (blocks.length){
        blocks[blocks.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };
  function createNewBlock(type){
    switch(type){
      case 'h3': return { type: 'h3', text: 'Nouveau titre de section' };
      case 'h4': return { type: 'h4', text: 'Nouveau sous-titre' };
      case 'p': return { type: 'p', html: 'Nouveau paragraphe à modifier.' };
      case 'fieldLabel': return { type: 'fieldLabel', text: 'Nouveau label' };
      case 'textarea': return { type: 'textarea', input: { placeholder: 'Saisir ici...' } };
      case 'fieldRow': return { type: 'fieldRow', fields: [
        { label: 'Champ 1', input: { type: 'text', placeholder: 'Saisir...' } },
        { label: 'Champ 2', input: { type: 'text', placeholder: 'Saisir...' } }
      ]};
      case 'inlineP': return { type: 'inlineP', segments: [
        { kind: 'text', value: 'Texte avant ' },
        { kind: 'input', input: { type: 'text', placeholder: 'champ' } },
        { kind: 'text', value: ' texte après.' }
      ]};
      case 'ul': return { type: 'ul', items: ['Premier item', 'Deuxième item', 'Troisième item'] };
      case 'checkboxes': return { type: 'checkboxes', items: [
        { label: 'Option 1', checked: false },
        { label: 'Option 2', checked: false }
      ]};
      default: return null;
    }
  }

  // ===== Sauvegarde =====
  // Helper safe : utilise mcAlert si possible, sinon redirect/log silencieux
  function safeAlert(msg, title){
    try {
      var ret = mcAlert(msg, { title: title });
      if (ret && typeof ret.then === 'function') return ret;
    } catch(e){ console.error('mcAlert failed:', e); }
    // Fallback : Promise immédiate
    return new Promise(function(resolve){ setTimeout(resolve, 50); });
  }

  window.saveCurrentTemplate = function(){
    // Récupérer les valeurs depuis le DOM (au cas où les listeners n'ont pas tout capté)
    var elLabel = document.getElementById('meta-label');
    var elRef = document.getElementById('meta-ref');
    if (elLabel) current.label = elLabel.value || current.label;
    if (elRef) current.ref = elRef.value || current.ref;

    if (!current.id || !current.id.match(/^[a-z0-9_-]+$/i)){
      safeAlert('⚠ L\'identifiant doit contenir uniquement lettres, chiffres, tirets et underscores.', 'Erreur');
      return;
    }
    if (!current.label){ safeAlert('⚠ Le titre est obligatoire.', 'Erreur'); return; }
    if (!current.ref){ safeAlert('⚠ La référence est obligatoire.', 'Erreur'); return; }
    var list = getTemplates();
    if (isNew){
      if (list.find(function(t){ return t.id === current.id; })){
        safeAlert('⚠ Cet identifiant existe déjà : choisissez-en un autre.', 'Erreur');
        return;
      }
      list.push(current);
    } else {
      var idx = list.findIndex(function(t){ return t.id === current.id; });
      if (idx === -1) list.push(current);
      else list[idx] = current;
    }
    saveTemplates(list);
    if (typeof logAction === 'function') logAction(isNew ? 'Template créé' : 'Template modifié', current.label);
    // Confirmation + redirection (toujours, même si la modale échoue)
    safeAlert('✓ Template sauvegardé avec succès.', 'Succès').then(function(){
      location.href = 'admin.html';
    });
  };

  window.cancelTemplateEdit = function(){
    var go = function(){ location.href = 'admin.html'; };
    try {
      mcConfirm('Annuler les modifications ?\nLes changements non sauvegardés seront perdus.', { okText: 'Annuler les modifs' }).then(function(ok){
        if (ok) go();
      });
    } catch(e){
      go();
    }
  };

  // ===== Init =====
  setTimeout(function(){
    renderForm();
    refreshPreview();
  }, 100);
})();
