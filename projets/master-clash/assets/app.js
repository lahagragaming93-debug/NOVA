// ===========================================================
// MASTER CLASH — Logique principale (multi-pages, compatible CEF FiveM)
// ===========================================================

// Permissions requises par page (clé = data-page sur <body>)
var PAGE_PERMS = {
  home: null,
  regl: null,
  part: null,
  contrats: 'contrats',
  gouv: 'gouv',
  ques: 'ques',
  budget: 'budget',
  profil: 'login',
  participants: 'login',  // accessible aux user connectés (admin = full droits)
  admin: 'admin'
};

var MC_DEFAULT_SECRET = 'MASTER2026';
var MC_SECRET_KEY = 'mc_secret_v1';
var MC_UNLOCK_KEY = 'mc_unlocked_v1';
var MC_ARCHIVE_KEY = 'mc_archives_v1';
var MC_USERS_KEY = 'mc_users_v1';
var MC_SESSION_KEY = 'mc_session_v1';
var MC_LOGS_KEY = 'mc_logs_v1';
var MC_MESSAGES_KEY = 'mc_messages_v1';
var MC_TEMPLATES_KEY = 'mc_templates_v1';
var MC_PARTICIPANTS_KEY = 'mc_participants_v1';
var MC_REGISTRATIONS_OPEN_KEY = 'mc_registrations_open';
var PARTICIPANTS_LIMIT = 42;
var STATUS_LABELS = {
  pending: '⏳ En attente',
  confirmed: '✓ Confirmé',
  absent: '✕ Absent',
  qualified: '🏆 Qualifié'
};

// ===========================================================
// TEMPLATES DE CONTRATS (système éditable)
// ===========================================================
function getTemplates(){
  try {
    var custom = JSON.parse(localStorage.getItem(MC_TEMPLATES_KEY) || 'null');
    if (custom && Array.isArray(custom) && custom.length > 0) return custom;
  } catch(e){}
  return (typeof DEFAULT_CONTRACT_TEMPLATES !== 'undefined') ? DEFAULT_CONTRACT_TEMPLATES : [];
}
function saveTemplates(list){ localStorage.setItem(MC_TEMPLATES_KEY, JSON.stringify(list)); }
function getTemplate(id){
  return getTemplates().find(function(t){ return t.id === id; }) || null;
}
// Récupère les méta (label, icon, ref) à jour pour un type de contrat — toujours frais depuis les templates
function getContractMeta(typeId){
  var t = getTemplate(typeId);
  if (t) return { label: t.label, icon: t.icon, ref: t.ref };
  if (typeof CONTRACT_LABELS !== 'undefined' && CONTRACT_LABELS[typeId]) return CONTRACT_LABELS[typeId];
  return { label: typeId, icon: '📄', ref: '' };
}
function resetTemplatesToDefault(){
  localStorage.removeItem(MC_TEMPLATES_KEY);
}

// Fonctions pour transformer un input descripteur en HTML <input>
function _renderInputAttr(input){
  if (!input) return '';
  var attrs = '';
  if (input.type) attrs += ' type="' + input.type + '"';
  if (input.placeholder) attrs += ' placeholder="' + escHtml(input.placeholder) + '"';
  if (input.value !== undefined && input.value !== '') attrs += ' value="' + escHtml(String(input.value)) + '"';
  if (input.optional) attrs += ' data-optional="1"';
  if (input.style) attrs += ' style="' + input.style + '"';
  return attrs;
}

// Construit le HTML d'un contrat à partir d'un template
function buildContractHTML(tpl){
  var h = '';
  // Header (logo + meta)
  h += '<div class="contract-header">';
  h +=   '<div class="contract-logo-block">';
  h +=     '<img src="assets/logo-mc.png" alt="Master Clash" class="cl-img">';
  h +=     '<div class="cl-tag">Le savoir ne suffit pas. Il faut vaincre.</div>';
  h +=   '</div>';
  h +=   '<div class="contract-meta">';
  h +=     '<div class="ct-title">Contrat de Partenariat</div>';
  (tpl.sectorSubs || []).forEach(function(s){ h += '<div class="ct-sub">' + escHtml(s) + '</div>'; });
  h +=     '<div class="ct-ref">Réf. ' + escHtml(tpl.ref) + '</div>';
  h +=     '<div class="ct-ed">Édition : <input type="text" placeholder="N°" style="min-width:60px"> &nbsp; Date : <input type="date"></div>';
  h +=   '</div>';
  h += '</div>';
  // Blocks
  (tpl.blocks || []).forEach(function(b){
    h += renderBlock(b);
  });
  // Signature block
  var sig = tpl.signature || { organizerLabel: 'Pour l\'Organisateur', partnerLabel: 'Pour le Partenaire' };
  h += '<div class="signature-block">';
  h +=   '<div class="signature-col">';
  h +=     '<h4>' + escHtml(sig.organizerLabel) + '</h4>';
  h +=     '<div class="sig-field"><div class="field-label">Nom &amp; fonction</div><input type="text" style="width:100%"></div>';
  h +=     '<div class="sig-field"><div class="field-label">Date</div><input type="date"></div>';
  h +=     '<div class="sig-wrap"><canvas class="sig-canvas" width="700" height="120"></canvas><button type="button" class="sig-clear" onclick="clearSig(this)">✕ Effacer signature</button></div>';
  h +=   '</div>';
  h +=   '<div class="signature-col">';
  h +=     '<h4>' + escHtml(sig.partnerLabel) + '</h4>';
  h +=     '<div class="sig-field"><div class="field-label">Nom &amp; fonction</div><input type="text" style="width:100%"></div>';
  h +=     '<div class="sig-field"><div class="field-label">Date</div><input type="date"></div>';
  h +=     '<div class="sig-wrap"><canvas class="sig-canvas" width="700" height="120"></canvas><button type="button" class="sig-clear" onclick="clearSig(this)">✕ Effacer signature</button></div>';
  h +=   '</div>';
  h += '</div>';
  // Footer
  h += '<div class="contract-footer">' + escHtml(tpl.footer || ('MASTER CLASH — Document officiel — Réf. ' + tpl.ref + ' — État de San Andreas')) + '</div>';
  return h;
}

function renderBlock(b){
  if (!b) return '';
  switch (b.type){
    case 'h3': return '<h3>' + escHtml(b.text || '') + '</h3>';
    case 'h4': return '<h4>' + escHtml(b.text || '') + '</h4>';
    case 'p': return '<p>' + (b.html || escHtml(b.text || '')) + '</p>';
    case 'fieldLabel': return '<div class="field-label">' + escHtml(b.text || '') + '</div>';
    case 'textarea': return '<textarea' + _renderInputAttr(b.input || {}) + '></textarea>';
    case 'inlineP':
      var s = '<p>';
      (b.segments || []).forEach(function(seg){
        if (seg.kind === 'text') s += escHtml(seg.value || '');
        else if (seg.kind === 'html') s += seg.value || '';
        else if (seg.kind === 'input'){
          var i = seg.input || {};
          if (i.type === 'textarea') s += '<textarea' + _renderInputAttr(i) + '></textarea>';
          else s += '<input' + _renderInputAttr(i) + '>';
        }
      });
      s += '</p>';
      return s;
    case 'fieldRow':
      var fr = '<div class="field-row">';
      (b.fields || []).forEach(function(f){
        fr += '<div><div class="field-label">' + escHtml(f.label || '') + '</div><input' + _renderInputAttr(f.input || {}) + '>';
        if (f.suffix) fr += ' ' + escHtml(f.suffix);
        fr += '</div>';
      });
      fr += '</div>';
      return fr;
    case 'ul':
      var u = '<ul>';
      (b.items || []).forEach(function(it){
        if (typeof it === 'string') u += '<li>' + escHtml(it) + '</li>';
        else if (it.html && it.input){
          u += '<li>' + it.html + '<input' + _renderInputAttr(it.input) + '></li>';
        } else if (it.html){
          u += '<li>' + it.html + '</li>';
        } else u += '<li>' + escHtml(String(it)) + '</li>';
      });
      u += '</ul>';
      return u;
    case 'checkboxes':
      var cb = '<p>';
      (b.items || []).forEach(function(it){
        cb += '<label class="checkbox-line"><input type="checkbox"' + (it.checked ? ' checked' : '') + (b.optional ? ' data-optional="1"' : '') + '> ' + escHtml(it.label || '') + '</label>';
      });
      cb += '</p>';
      return cb;
    default: return '';
  }
}

// Construit dynamiquement les panels de contrats sur la page contrats.html
function renderAllContractPanels(){
  if (document.body.dataset.page !== 'contrats') return;
  var templates = getTemplates();
  // Mettre à jour CONTRACT_LABELS pour que les fonctions existantes (notifs, archives) fonctionnent
  if (typeof CONTRACT_LABELS !== 'undefined'){
    templates.forEach(function(t){
      CONTRACT_LABELS[t.id] = { label: t.label, icon: t.icon, ref: t.ref };
    });
  }
  // Mettre à jour les onglets (sauf bons et archives, gardés)
  var tabsInner = document.querySelector('.contract-tabs-inner');
  if (!tabsInner) return;
  // Récupérer les onglets fixes (bons + archives)
  var bonsTab = tabsInner.querySelector('.contract-tab[data-tab="bons"]');
  var archivesTab = tabsInner.querySelector('.contract-tab[data-tab="archives"]');
  // Vider et reconstruire
  tabsInner.innerHTML = '';
  templates.forEach(function(t, i){
    var btn = document.createElement('button');
    btn.className = 'contract-tab' + (i === 0 ? ' active' : '');
    btn.dataset.tab = t.id;
    btn.textContent = (t.icon || '') + ' ' + t.label.replace(/^Contrat\s+/, '');
    tabsInner.appendChild(btn);
  });
  if (bonsTab) tabsInner.appendChild(bonsTab);
  if (archivesTab) tabsInner.appendChild(archivesTab);

  // Régénérer les panels (on garde panel-bons et panel-archives)
  var section = document.getElementById('contrats');
  var bonsPanel = document.getElementById('panel-bons');
  var archivesPanel = document.getElementById('panel-archives');
  // Supprimer les anciens panels custom (sauf bons, archives, et la barre tabs)
  Array.from(section.querySelectorAll('.contract-panel')).forEach(function(p){
    if (p.id !== 'panel-bons' && p.id !== 'panel-archives') p.remove();
  });
  // Insérer les nouveaux panels avant le panel-bons
  templates.forEach(function(t, i){
    var panel = document.createElement('div');
    panel.className = 'contract-panel' + (i === 0 ? ' active' : '');
    panel.id = 'panel-' + t.id;
    panel.innerHTML = '<div class="print-bar"><div class="print-info">📋 Le contrat sera imprimable et téléchargeable en PNG une fois validé par l\'organisateur.</div></div>'
      + '<div class="contract-doc">' + buildContractHTML(t) + '</div>'
      + '<div class="validate-bar"><button class="validate-btn" onclick="validateContract(\'' + t.id + '\')">✓ Valider et archiver le contrat</button></div>';
    if (bonsPanel) section.insertBefore(panel, bonsPanel);
    else section.appendChild(panel);
  });

  // Réattacher les handlers d'onglets
  document.querySelectorAll('.contract-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      var target = tab.getAttribute('data-tab');
      document.querySelectorAll('.contract-tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.contract-panel').forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      var panel = document.getElementById('panel-' + target);
      if (panel) panel.classList.add('active');
      if (target === 'archives' && typeof renderArchivesList === 'function') renderArchivesList();
    });
  });

  // Initialiser les canvas signature des contrats nouvellement générés
  document.querySelectorAll('.contract-panel:not(#panel-bons):not(#panel-archives) .sig-canvas').forEach(function(c){
    if (typeof initSigCanvas === 'function') initSigCanvas(c);
  });

  // Re-verrouiller la zone Organisateur dans tous les contrats actifs
  document.querySelectorAll('.contract-panel:not(#panel-bons):not(#panel-archives) .contract-doc .signature-block .signature-col:first-child').forEach(function(col){
    col.querySelectorAll('input, textarea').forEach(function(el){
      el.setAttribute('disabled', 'disabled');
      el.setAttribute('readonly', 'readonly');
      el.classList.add('org-locked-input');
    });
    var canvas = col.querySelector('canvas.sig-canvas');
    if (canvas) canvas.classList.add('org-locked-canvas');
    var clearBtn = col.querySelector('.sig-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    if (!col.querySelector('.org-locked-msg')){
      var msg = document.createElement('div');
      msg.className = 'org-locked-msg';
      msg.textContent = '⚠ Zone réservée à l\'organisateur — sera complétée après réception';
      col.insertBefore(msg, col.firstChild);
    }
  });
}
var SECRET_QUESTIONS = {
  pet: 'Quel est le nom de votre premier animal de compagnie ?',
  mother: 'Quel est le nom de jeune fille de votre mère ?',
  city: 'Dans quelle ville êtes-vous né(e) ?',
  friend: 'Quel est le nom de votre meilleur ami d\'enfance ?',
  color: 'Quelle est votre couleur préférée ?',
  car: 'Quel est le modèle de votre première voiture ?',
  school: 'Quel était le nom de votre école primaire ?'
};
var MC_SECRET = localStorage.getItem(MC_SECRET_KEY) || MC_DEFAULT_SECRET;

// ===========================================================
// AUTHENTIFICATION (système RP — pas une vraie sécurité serveur)
// ===========================================================
function getUsers(){
  try { return JSON.parse(localStorage.getItem(MC_USERS_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveUsers(list){ localStorage.setItem(MC_USERS_KEY, JSON.stringify(list)); }
function getCurrentUser(){
  try {
    var s = JSON.parse(localStorage.getItem(MC_SESSION_KEY) || 'null');
    if (!s) return null;
    var users = getUsers();
    return users.find(function(u){ return u.username === s.username; }) || null;
  } catch(e){ return null; }
}
function setSession(username){ localStorage.setItem(MC_SESSION_KEY, JSON.stringify({ username: username, loginAt: new Date().toISOString() })); }
function clearSession(){ localStorage.removeItem(MC_SESSION_KEY); }

// Avatars par défaut (SVG inline data URI)
function defaultAvatar(name){
  var initials = (name || '?').trim().slice(0, 2).toUpperCase();
  var hue = 0;
  for (var i = 0; i < (name || '').length; i++) hue = (hue + name.charCodeAt(i)) % 360;
  var bg = 'hsl(' + hue + ',50%,30%)';
  var fg = 'hsl(' + hue + ',60%,75%)';
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="' + bg + '"/><text x="40" y="50" font-size="34" font-family="Arial" font-weight="bold" fill="' + fg + '" text-anchor="middle">' + initials + '</text></svg>';
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Initialisation : créer le compte admin au 1er lancement
// Identité unifiée avec NOVA : A.Beauchamp / BoulaTV2026
// (alias historique BoulaTV conservé pour rétro-compatibilité des threads de messages)
function initAdminUser(){
  var users = getUsers();
  if (users.length === 0){
    users.push({
      username: 'A.Beauchamp',
      password: 'BoulaTV2026',
      displayName: 'A.Beauchamp (Président NOVA)',
      avatar: defaultAvatar('AB'),
      isAdmin: true,
      perms: ['regl','part','contrats','gouv','ques','budget','bons','validate','print'],
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
  }
}
initAdminUser();

// ----- LOGIN -----
function openLoginModal(){
  document.getElementById('login-modal').classList.add('active');
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  setTimeout(function(){ document.getElementById('login-username').focus(); }, 60);
}
function closeLoginModal(){ document.getElementById('login-modal').classList.remove('active'); }
function doLogin(){
  var u = (document.getElementById('login-username').value || '').trim();
  var p = document.getElementById('login-password').value || '';
  if (!u || !p){ document.getElementById('login-error').textContent = 'Saisissez votre identifiant et votre mot de passe.'; return; }
  var users = getUsers();
  var user = users.find(function(x){ return x.username.toLowerCase() === u.toLowerCase(); });
  if (!user || user.password !== p){
    document.getElementById('login-error').textContent = '⚠ Identifiants incorrects.';
    return;
  }
  setSession(user.username);
  logAction('Connexion');
  try { localStorage.removeItem(MC_UNLOCK_KEY); } catch(e){}

  function finishLogin(){
    // Redirect vers la home pour repartir d'un état propre (sans query params hérités)
    location.href = 'index.html';
  }

  if (window.MC_FB && MC_FB.available && MC_FB.auth){
    var email = user.email || (user.username.toLowerCase() + '@masterclash.local');
    var onAuthSuccess = function(){
      if (window.MC_DATA && user.password){
        return MC_DATA.update('users', user.username, { email: email });
      }
    };
    var authPromise = MC_FB.auth.signInWithEmailAndPassword(email, p)
      .then(function(cred){ console.log('[MC_AUTH] Connecté Firebase :', user.username); return onAuthSuccess(); })
      .catch(function(err){
        if (err && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials')){
          console.log('[MC_AUTH] Création du compte Firebase pour', user.username);
          return MC_FB.auth.createUserWithEmailAndPassword(email, p)
            .then(function(){ console.log('[MC_AUTH] Compte créé'); return onAuthSuccess(); })
            .catch(function(e){ console.warn('[MC_AUTH] createUser error:', e && e.code, e && e.message); });
        } else if (err){
          console.warn('[MC_AUTH] signIn error:', err.code, err.message);
        }
      });
    // On attend la fin de l'auth Firebase (max 4s) avant de rediriger
    var timeoutPromise = new Promise(function(r){ setTimeout(r, 4000); });
    Promise.race([authPromise, timeoutPromise]).then(finishLogin);
  } else {
    finishLogin();
  }
}
function doLogout(){
  mcConfirm('Voulez-vous vous déconnecter ?', { okText: 'Déconnexion' }).then(function(ok){
    if (!ok) return;
    logAction('Déconnexion');
    clearSession();
    try { localStorage.removeItem(MC_UNLOCK_KEY); } catch(e){}
    // Déconnexion Firebase (sans bloquer)
    if (window.MC_FB && MC_FB.available && MC_FB.auth){
      MC_FB.auth.signOut().catch(function(err){ console.warn('[MC_AUTH] signOut:', err); });
    }
    location.href = 'index.html';
  });
}

// ----- INSCRIPTION (auto-inscription partenaire) -----
var _regAvatarDataURL = '';
function openRegisterModal(){
  _regAvatarDataURL = '';
  document.getElementById('register-modal').classList.add('active');
  document.getElementById('register-error').textContent = '';
  document.getElementById('reg-username').value = '';
  document.getElementById('reg-displayname').value = '';
  document.getElementById('reg-password').value = '';
  document.getElementById('reg-password2').value = '';
  document.getElementById('reg-avatar-preview').src = defaultAvatar('?');
  setTimeout(function(){ document.getElementById('reg-username').focus(); }, 60);
}
function closeRegisterModal(){ document.getElementById('register-modal').classList.remove('active'); }
function handleRegAvatarUpload(ev){
  var file = ev.target.files[0];
  if (!file) return;
  if (file.size > 800 * 1024){
    mcAlert('⚠ L\'image est trop lourde (max 800 Ko).', { title: 'Erreur' });
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e){
    _regAvatarDataURL = e.target.result;
    document.getElementById('reg-avatar-preview').src = _regAvatarDataURL;
  };
  reader.readAsDataURL(file);
}
function doRegister(){
  var u = (document.getElementById('reg-username').value || '').trim();
  var dn = (document.getElementById('reg-displayname').value || '').trim();
  var p1 = document.getElementById('reg-password').value || '';
  var p2 = document.getElementById('reg-password2').value || '';
  var sq = document.getElementById('reg-secret-question').value || '';
  var sa = (document.getElementById('reg-secret-answer').value || '').trim();
  var err = document.getElementById('register-error');
  err.textContent = '';

  if (!u){ err.textContent = '⚠ Saisissez un nom d\'utilisateur.'; return; }
  if (!/^[a-zA-Z0-9._-]+$/.test(u)){ err.textContent = '⚠ Login : lettres, chiffres, points, tirets seulement.'; return; }
  if (u.length < 3){ err.textContent = '⚠ Le login doit faire au moins 3 caractères.'; return; }
  if (!dn){ err.textContent = '⚠ Saisissez le nom de votre entreprise.'; return; }
  if (!p1){ err.textContent = '⚠ Saisissez un mot de passe.'; return; }
  if (p1.length < 4){ err.textContent = '⚠ Le mot de passe doit faire au moins 4 caractères.'; return; }
  if (p1 !== p2){ err.textContent = '⚠ Les mots de passe ne correspondent pas.'; return; }
  if (!sq){ err.textContent = '⚠ Choisissez une question secrète.'; return; }
  if (!sa){ err.textContent = '⚠ Saisissez la réponse à votre question secrète.'; return; }

  var users = getUsers();
  if (users.find(function(x){ return x.username.toLowerCase() === u.toLowerCase(); })){
    err.textContent = '⚠ Ce nom d\'utilisateur est déjà pris. Choisissez-en un autre.';
    return;
  }
  var fbEmail = u.toLowerCase() + '@masterclash.local';
  var newUser = {
    username: u,
    email: fbEmail,
    password: p1,
    displayName: dn,
    avatar: _regAvatarDataURL || defaultAvatar(dn),
    isAdmin: false,
    isPartner: false, // BoulaTV doit valider l'utilisateur en partenaire
    perms: ['regl', 'part'], // règlement + voir page partenaires uniquement (pas les contrats)
    secretQuestion: sq,
    secretAnswer: sa,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  setSession(u);
  logAction('Inscription nouveau compte', dn);
  try { localStorage.removeItem(MC_UNLOCK_KEY); } catch(e){}
  try { sessionStorage.setItem('mc_just_registered', dn); } catch(e){}
  // Création parallèle du compte Firebase Auth (silencieux, non-bloquant)
  if (window.MC_FB && MC_FB.available && MC_FB.auth){
    MC_FB.auth.createUserWithEmailAndPassword(fbEmail, p1)
      .then(function(){ console.log('[MC_AUTH] Compte Firebase créé pour', u); })
      .catch(function(e){ console.warn('[MC_AUTH] createUser register:', e && e.code); });
  }
  location.reload();
}

// Au chargement, si on vient de s'inscrire, afficher le message de bienvenue
(function(){
  try {
    var justReg = sessionStorage.getItem('mc_just_registered');
    if (justReg){
      sessionStorage.removeItem('mc_just_registered');
      setTimeout(function(){
        mcAlert('✓ Bienvenue ' + justReg + ' !\n\nVotre compte a été créé et vous êtes connecté.\nVous avez accès au Règlement, aux Partenaires et aux Contrats.\n\nPour des accès supplémentaires, contactez l\'organisateur.', { title: 'Compte créé' });
      }, 200);
    }
  } catch(e){}
})();

// ----- PERMISSIONS -----
function userHasPerm(perm){
  var u = getCurrentUser();
  if (!u) return false;
  if (u.isAdmin) return true;
  return (u.perms || []).indexOf(perm) !== -1;
}
function userIsAdmin(){
  var u = getCurrentUser();
  return !!(u && u.isAdmin);
}

// Sections : selon les perms du user, on affiche/masque le contenu
// Sans login : Règlement et Partenaires accessibles en lecture seule
var SECTION_PERMS = {
  gouv: 'gouv',
  ques: 'ques',
  budget: 'budget',
  admin: null // admin only via isAdmin
};

// Vérifie l'accès à la page courante. Si l'user n'a pas la perm, redirige vers index.
function checkPageAccess(){
  var page = (document.body && document.body.dataset.page) || 'home';
  var requiredPerm = PAGE_PERMS[page];
  var user = getCurrentUser();
  if (requiredPerm === null) return true; // page publique
  if (requiredPerm === 'login'){
    if (user) return true;
    var msg = 'Cette page nécessite d\'être connecté.';
    setTimeout(function(){
      mcAlert(msg, { title: '🔐 Connexion requise' }).then(function(){
        location.replace('index.html');
      });
    }, 100);
    return false;
  }
  if (requiredPerm === 'admin'){
    if (user && user.isAdmin) return true;
    setTimeout(function(){
      mcAlert('🚫 Cette page est réservée à l\'administrateur.', { title: 'Accès refusé' }).then(function(){
        location.replace('index.html');
      });
    }, 100);
    return false;
  }
  // Sinon : permission spécifique
  if (user && (user.isAdmin || (user.perms || []).indexOf(requiredPerm) !== -1)) return true;
  setTimeout(function(){
    var alertMsg = user
      ? 'Votre compte « ' + (user.displayName || user.username) + ' » n\'a pas les permissions pour accéder à cette page.\n\nContactez l\'organisateur (BoulaTV).'
      : 'Cette page nécessite une autorisation.\n\nConnectez-vous avec un compte ayant les droits requis.';
    mcAlert(alertMsg, { title: '🚫 Accès refusé' }).then(function(){
      location.replace('index.html');
    });
  }, 100);
  return false;
}

function applyAuthState(){
  var user = getCurrentUser();
  var loginBtn = document.getElementById('nav-login-btn');
  var userBox = document.getElementById('nav-user-box');
  var profilLink = document.getElementById('nav-profil-link');
  var profilSection = document.getElementById('profil');

  // Onglet "Mon profil" visible uniquement si connecté
  if (profilLink) profilLink.style.display = user ? '' : 'none';
  // Onglet Participants visible si connecté
  var participantsLink = document.getElementById('nav-participants-link');
  if (participantsLink) participantsLink.style.display = user ? '' : 'none';
  if (profilSection){
    if (user){ profilSection.style.display = ''; if (typeof showProfilSection === 'function') showProfilSection(); }
    else { profilSection.style.display = 'none'; }
  }

  // Page home : afficher/masquer les cards selon les perms
  var homeAdminCard = document.getElementById('home-card-admin');
  if (homeAdminCard) homeAdminCard.style.display = (user && user.isAdmin) ? '' : 'none';
  var homeProfilCard = document.getElementById('home-card-profil');
  if (homeProfilCard) homeProfilCard.style.display = user ? '' : 'none';
  document.querySelectorAll('.home-card[data-perm]').forEach(function(card){
    var perm = card.dataset.perm;
    var has = user && (user.isAdmin || (user.perms || []).indexOf(perm) !== -1);
    var lock = card.querySelector('.home-card-lock');
    if (lock) lock.style.display = has ? 'none' : '';
  });

  if (user){
    loginBtn.style.display = 'none';
    userBox.style.display = '';
    document.getElementById('nav-avatar').src = user.avatar || defaultAvatar(user.displayName || user.username);
    document.getElementById('nav-username').textContent = user.displayName || user.username;
    var roleEl = document.getElementById('nav-userrole');
    if (user.isAdmin){
      roleEl.textContent = '👑 Admin';
      roleEl.className = 'nav-userrole admin';
    } else if (user.isPartner){
      roleEl.textContent = '🤝 Partenaire';
      roleEl.className = 'nav-userrole partner';
    } else {
      roleEl.textContent = '👤 Utilisateur';
      roleEl.className = 'nav-userrole user';
    }
  } else {
    loginBtn.style.display = '';
    userBox.style.display = 'none';
  }

  // Liste de toutes les sections / panels protégés
  var protectedItems = [
    { sectionId: 'gouv',     perm: 'gouv',     linkSelector: '.nav-links a[href="gouverneur.html"]' },
    { sectionId: 'contrats', perm: 'contrats', linkSelector: '.nav-links a[href="contrats.html"]' },
    { sectionId: 'ques',     perm: 'ques',     linkSelector: '.nav-links a[href="questions.html"]' },
    { sectionId: 'budget',   perm: 'budget',   linkSelector: '.nav-links a[href="budget.html"]' }
  ];
  protectedItems.forEach(function(item){
    var hasAccess = userIsAdmin() || userHasPerm(item.perm);
    // 1) Mise à jour de la section interne (uniquement si elle est dans le DOM)
    var section = document.getElementById(item.sectionId);
    if (section){
      var content = section.querySelector('.locked-content');
      var overlay = section.querySelector('.lock-overlay');
      if (content){
        if (hasAccess) content.classList.remove('locked');
        else content.classList.add('locked');
      }
      if (overlay) overlay.style.display = hasAccess ? 'none' : '';
    }
    // 2) Mise à jour du lien dans la nav — TOUJOURS, même si la section n'est pas
    // sur la page courante (la nav est globale).
    var link = document.querySelector(item.linkSelector);
    if (link){
      var icon = link.querySelector('.lock-icon');
      if (hasAccess){
        if (icon) icon.style.display = 'none';
        link.classList.remove('locked-link-visual');
        link.classList.add('access-ok');
      } else {
        if (icon) icon.style.display = '';
        link.classList.remove('access-ok');
      }
    }
  });

  // Bons (panel à l'intérieur de Contrats)
  var bonsPanel = document.getElementById('panel-bons');
  if (bonsPanel){
    var bc = bonsPanel.querySelector('.locked-content');
    var bo = bonsPanel.querySelector('.lock-overlay');
    var bonsAccess = userIsAdmin() || userHasPerm('bons');
    if (bc){
      if (bonsAccess) bc.classList.remove('locked');
      else bc.classList.add('locked');
    }
    if (bo) bo.style.display = bonsAccess ? 'none' : '';
    // Mise à jour de l'onglet "🔒 Bons Officiels"
    var bonsTab = document.querySelector('.contract-tab[data-tab="bons"]');
    if (bonsTab) bonsTab.innerHTML = bonsAccess ? 'Bons Officiels' : '🔒 Bons Officiels';
  }

  // Admin
  var adminLink = document.querySelector('.nav-links a[href="admin.html"]');
  var adminSection = document.getElementById('admin');
  var ac = adminSection && adminSection.querySelector('.locked-content');
  var ao = adminSection && adminSection.querySelector('.lock-overlay');
  if (userIsAdmin()){
    if (adminLink){
      adminLink.style.display = '';
      var icon = adminLink.querySelector('.lock-icon');
      if (icon) icon.style.display = 'none';
    }
    if (ac) ac.classList.remove('locked');
    if (ao) ao.style.display = 'none';
    renderUsersList();
  } else {
    // Non-admin : on cache complètement l'onglet Admin de la nav (inutile)
    if (adminLink) adminLink.style.display = 'none';
    if (ac) ac.classList.add('locked');
    if (ao) ao.style.display = '';
  }
}

// ----- GESTION UTILISATEURS (modale création/édition) -----
var _userEditingUsername = null;
var _userAvatarDataURL = '';

function openUserModal(editUsername){
  _userEditingUsername = editUsername || null;
  _userAvatarDataURL = '';
  var modal = document.getElementById('user-modal');
  document.getElementById('user-error').textContent = '';
  document.getElementById('user-modal-title').textContent = editUsername ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur';
  document.getElementById('user-modal-sub').textContent = editUsername ? 'Édition utilisateur' : 'Créer un utilisateur';
  document.getElementById('user-pw-label').textContent = editUsername ? 'Mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe';

  if (editUsername){
    var users = getUsers();
    var u = users.find(function(x){ return x.username === editUsername; });
    if (!u) return;
    document.getElementById('user-username').value = u.username;
    document.getElementById('user-username').disabled = true;
    document.getElementById('user-displayname').value = u.displayName || '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-avatar-preview').src = u.avatar || defaultAvatar(u.displayName || u.username);
    _userAvatarDataURL = u.avatar || '';
    document.getElementById('user-isadmin').checked = !!u.isAdmin;
    document.querySelectorAll('.perm-cb').forEach(function(cb){
      cb.checked = (u.perms || []).indexOf(cb.dataset.perm) !== -1;
    });
  } else {
    document.getElementById('user-username').value = '';
    document.getElementById('user-username').disabled = false;
    document.getElementById('user-displayname').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-avatar-preview').src = defaultAvatar('?');
    document.getElementById('user-isadmin').checked = false;
    document.querySelectorAll('.perm-cb').forEach(function(cb){
      cb.checked = ['regl','part','contrats'].indexOf(cb.dataset.perm) !== -1;
    });
  }
  modal.classList.add('active');
}
function closeUserModal(){ document.getElementById('user-modal').classList.remove('active'); }

function handleAvatarUpload(ev){
  var file = ev.target.files[0];
  if (!file) return;
  if (file.size > 800 * 1024){
    mcAlert('⚠ L\'image est trop lourde (max 800 Ko).\nUtilisez une image plus petite.', { title: 'Erreur' });
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e){
    _userAvatarDataURL = e.target.result;
    document.getElementById('user-avatar-preview').src = _userAvatarDataURL;
  };
  reader.readAsDataURL(file);
}
function clearAvatarPreview(){
  _userAvatarDataURL = '';
  var name = document.getElementById('user-displayname').value || '?';
  document.getElementById('user-avatar-preview').src = defaultAvatar(name);
}

function saveUserFromModal(){
  var username = (document.getElementById('user-username').value || '').trim();
  var displayName = (document.getElementById('user-displayname').value || '').trim();
  var password = document.getElementById('user-password').value || '';
  var isAdmin = document.getElementById('user-isadmin').checked;
  var perms = Array.from(document.querySelectorAll('.perm-cb')).filter(function(cb){ return cb.checked; }).map(function(cb){ return cb.dataset.perm; });
  var err = document.getElementById('user-error');

  if (!username){ err.textContent = '⚠ Saisissez un nom d\'utilisateur.'; return; }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)){ err.textContent = '⚠ Nom d\'utilisateur : lettres, chiffres, points, tirets seulement.'; return; }
  if (!displayName){ err.textContent = '⚠ Saisissez un nom affiché.'; return; }
  if (!_userEditingUsername && !password){ err.textContent = '⚠ Saisissez un mot de passe.'; return; }
  if (password && password.length < 4){ err.textContent = '⚠ Le mot de passe doit faire au moins 4 caractères.'; return; }

  var users = getUsers();
  if (_userEditingUsername){
    var idx = users.findIndex(function(x){ return x.username === _userEditingUsername; });
    if (idx === -1){ err.textContent = 'Utilisateur introuvable.'; return; }
    users[idx].displayName = displayName;
    if (password) users[idx].password = password;
    users[idx].avatar = _userAvatarDataURL || defaultAvatar(displayName);
    users[idx].isAdmin = isAdmin;
    users[idx].perms = perms;
  } else {
    var exists = users.find(function(x){ return x.username.toLowerCase() === username.toLowerCase(); });
    if (exists){ err.textContent = '⚠ Ce nom d\'utilisateur existe déjà.'; return; }
    users.push({
      username: username,
      password: password,
      displayName: displayName,
      avatar: _userAvatarDataURL || defaultAvatar(displayName),
      isAdmin: isAdmin,
      perms: perms,
      createdAt: new Date().toISOString()
    });
  }
  saveUsers(users);
  // Si on a édité son propre compte, forcer un reload pour que les nouvelles perms s'appliquent partout
  var current = getCurrentUser();
  var editingSelf = _userEditingUsername && current && current.username === _userEditingUsername;
  closeUserModal();
  if (editingSelf){
    try { localStorage.removeItem(MC_UNLOCK_KEY); } catch(e){}
    mcAlert('✓ Compte modifié.\nLa page va se recharger pour appliquer les changements.', { title: 'Succès' }).then(function(){
      location.reload();
    });
    return;
  }
  renderUsersList();
  applyAuthState();
  mcAlert('✓ Utilisateur ' + (_userEditingUsername ? 'modifié' : 'créé') + ' avec succès.', { title: 'Succès' });
}

function deleteUser(username){
  if (username === 'BoulaTV'){
    mcAlert('⚠ Le compte BoulaTV ne peut pas être supprimé.', { title: 'Erreur' });
    return;
  }
  mcConfirm('Supprimer le compte « ' + username + ' » ?\n\nCette action est irréversible.', { title: '🗑 Supprimer', okText: 'Supprimer' })
    .then(function(ok){
      if (!ok) return;
      var users = getUsers().filter(function(x){ return x.username !== username; });
      saveUsers(users);
      // Si on supprime le user actuellement loggé, déconnecter
      var current = getCurrentUser();
      if (current && current.username === username){
        clearSession();
        applyAuthState();
      }
      renderUsersList();
      mcAlert('✓ Utilisateur supprimé.', { title: 'Succès' });
    });
}

var PERM_LABELS = {
  regl: 'Règlement', part: 'Partenaires', contrats: 'Contrats',
  gouv: 'Gouverneur', ques: 'Questions', budget: 'Budget', bons: 'Bons',
  validate: 'Validation', print: 'Impression/PNG', all_contracts: 'Voir tous les contrats'
};
function renderUsersList(){
  var c = document.getElementById('users-list');
  if (!c) return;
  var users = getUsers();
  var badge = document.getElementById('users-count-badge');
  if (badge) badge.textContent = users.length;
  if (users.length === 0){ c.innerHTML = '<div style="color:#6a7a8a;font-style:italic;padding:14px;text-align:center;background:#141926;border-radius:8px">Aucun utilisateur enregistré.</div>'; return; }
  c.innerHTML = '<div class="users-list">' + users.map(function(u){
    var permsLabels = (u.perms || []).map(function(p){ return PERM_LABELS[p] || p; });
    var permsLabel = u.isAdmin
      ? '👑 ADMIN — tous les droits'
      : (permsLabels.length ? permsLabels.join(' · ') : '⚠ Aucune permission');
    var date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '';
    return '<div class="user-item' + (u.isAdmin ? ' admin-item' : '') + '">'
      + '<img class="user-item-avatar" src="' + (u.avatar || defaultAvatar(u.displayName || u.username)) + '" alt="">'
      + '<div class="user-item-info">'
        + '<div class="user-item-name">' + escHtml(u.displayName || u.username) + (date ? ' <span style="color:#6a7a8a;font-size:10px;font-weight:400">— créé le ' + date + '</span>' : '') + '</div>'
        + '<div class="user-item-login">@' + escHtml(u.username) + '</div>'
        + '<div class="user-item-perms' + (u.isAdmin ? ' admin' : '') + '">' + escHtml(permsLabel) + '</div>'
      + '</div>'
      + '<div class="user-item-actions">'
        + '<button class="user-item-btn edit" onclick="openUserModal(\'' + u.username + '\')">✎ Modifier</button>'
        + (u.username === 'BoulaTV' ? '' : '<button class="user-item-btn del" onclick="deleteUser(\'' + u.username + '\')">🗑 Supprimer</button>')
      + '</div>'
    + '</div>';
  }).join('') + '</div>';
}
// Rafraîchir les listes à chaque clic sur l'onglet Admin
(function(){
  var adminLink = document.querySelector('.nav-links a[href="admin.html"]');
  if (adminLink) adminLink.addEventListener('click', function(){
    setTimeout(function(){
      if (userIsAdmin()){
        renderUsersList();
        renderAdminLogs();
      }
    }, 80);
  });
})();

// ===========================================================
// BACKUP / RESTORE — sauvegarde JSON de toutes les données
// ===========================================================
function exportBackup(){
  var data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    secret: localStorage.getItem(MC_SECRET_KEY) || null,
    users: getUsers(),
    archives: getArchives()
  };
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var stamp = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  a.href = url;
  a.download = 'master-clash-backup-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  var info = document.getElementById('backup-info');
  if (info) info.textContent = '✓ Sauvegarde téléchargée le ' + d.toLocaleString('fr-FR') + ' — ' + data.users.length + ' utilisateur(s), ' + data.archives.length + ' contrat(s).';
}
function importBackupFile(ev){
  var file = ev.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var data;
    try { data = JSON.parse(e.target.result); } catch(err){
      mcAlert('⚠ Fichier invalide : ce n\'est pas un JSON valide.', { title: 'Erreur' });
      return;
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.users)){
      mcAlert('⚠ Le fichier ne semble pas être une sauvegarde Master Clash valide.', { title: 'Erreur' });
      return;
    }
    var summary = '⚠ Cette restauration va REMPLACER toutes les données actuelles :\n\n'
      + '• ' + data.users.length + ' utilisateur(s) (vous écraserez les comptes actuels)\n'
      + '• ' + (data.archives ? data.archives.length : 0) + ' contrat(s) archivé(s)\n'
      + '• Code admin restauré\n\n'
      + 'Sauvegarde du ' + (data.exportedAt ? new Date(data.exportedAt).toLocaleString('fr-FR') : 'date inconnue') + '\n\n'
      + 'Continuer ?';
    mcConfirm(summary, { title: '📂 Restaurer la sauvegarde', okText: 'Restaurer' }).then(function(ok){
      if (!ok){ ev.target.value = ''; return; }
      try {
        saveUsers(data.users);
        if (Array.isArray(data.archives)) localStorage.setItem(MC_ARCHIVE_KEY, JSON.stringify(data.archives));
        if (data.secret) localStorage.setItem(MC_SECRET_KEY, data.secret);
        clearSession();
        localStorage.removeItem(MC_UNLOCK_KEY);
        mcAlert('✓ Sauvegarde restaurée avec succès !\nLa page va se recharger.', { title: 'Restauration réussie' }).then(function(){ location.reload(); });
      } catch(err){
        mcAlert('⚠ Erreur pendant la restauration : ' + err.message, { title: 'Erreur' });
      }
    });
  };
  reader.readAsText(file);
}

// ===========================================================
// GÉNÉRATION DE MOT DE PASSE ALÉATOIRE
// ===========================================================
function generateRandomPassword(){
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/I/1 pour éviter confusion
  var len = 8;
  var pwd = '';
  for (var i = 0; i < len; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  document.getElementById('user-password').value = pwd;
  // Afficher une notification visuelle
  var input = document.getElementById('user-password');
  input.style.background = 'rgba(245,197,24,.2)';
  input.style.borderColor = '#f5c518';
  setTimeout(function(){ input.style.background = ''; input.style.borderColor = ''; }, 1000);
}

// ===========================================================
// NOTIFICATIONS ADMIN (badges sur l'onglet Admin)
// ===========================================================
function getNotifsList(){
  var notifs = [];
  if (!userIsAdmin()) return notifs;
  var lastSeen = parseInt(localStorage.getItem('mc_admin_last_seen') || '0', 10);
  // Pending contracts
  getArchives().filter(function(r){ return r.status === 'pending'; }).forEach(function(r){
    var meta = (typeof CONTRACT_LABELS !== 'undefined' && CONTRACT_LABELS[r.type]) || { label: r.type, icon: '📋' };
    var ts = r.submittedAt ? new Date(r.submittedAt).getTime() : 0;
    notifs.push({
      type: 'pending',
      icon: '⏳',
      title: 'Contrat en attente de validation',
      desc: r.partnerName + ' — ' + meta.label,
      at: r.submittedAt || r.validatedAt,
      target: 'contrats.html?view=' + r.id,
      isNew: ts > lastSeen
    });
  });
  // New users
  getUsers().forEach(function(u){
    if (u.username === 'BoulaTV' || !u.createdAt) return;
    var ts = new Date(u.createdAt).getTime();
    if (ts <= lastSeen - 7 * 24 * 3600 * 1000) return; // limite à 7 jours pour ne pas saturer
    notifs.push({
      type: 'user',
      icon: '👤',
      title: 'Nouveau compte créé',
      desc: u.displayName + ' (@' + u.username + ')',
      at: u.createdAt,
      target: 'admin.html#users-list',
      isNew: ts > lastSeen
    });
  });
  // Threads avec entries non lues par l'admin
  getMessages().forEach(function(t){
    var unread = threadUnreadCountFor(t, 'BoulaTV');
    if (unread === 0) return;
    var lastEntry = t.entries[t.entries.length - 1] || {};
    notifs.push({
      type: 'message',
      icon: '📨',
      title: (unread > 1 ? unread + ' messages — ' : 'Message de ') + resolveUserDisplay(lastEntry.from || ''),
      desc: t.subject,
      at: t.lastActivityAt,
      target: 'admin.html#messages-list',
      isNew: true
    });
  });
  // Tri par date décroissante
  notifs.sort(function(a, b){ return new Date(b.at) - new Date(a.at); });
  return notifs;
}

function refreshAdminNotifications(){
  var wrap = document.getElementById('nav-notif-wrap');
  if (!userIsAdmin()){ if (wrap) wrap.style.display = 'none'; return; }
  if (wrap) wrap.style.display = '';
  var notifs = getNotifsList();
  var newCount = notifs.filter(function(n){ return n.isNew; }).length;
  var countEl = document.getElementById('nav-notif-count');
  if (countEl){
    if (newCount > 0){
      countEl.textContent = newCount > 99 ? '99+' : newCount;
      countEl.classList.remove('empty');
    } else {
      countEl.classList.add('empty');
    }
  }
}

function toggleNotifs(ev){
  if (ev) ev.stopPropagation();
  var dd = document.getElementById('nav-notif-dropdown');
  if (!dd) return;
  if (dd.classList.contains('open')){
    dd.classList.remove('open');
  } else {
    renderNotifsDropdown();
    dd.classList.add('open');
  }
}

function renderNotifsDropdown(){
  var c = document.getElementById('nav-notif-list');
  if (!c) return;
  // On n'affiche que les notifications NON-LUES dans le dropdown
  var notifs = getNotifsList().filter(function(n){ return n.isNew; });
  if (notifs.length === 0){
    c.innerHTML = '<div class="notif-empty">📭 Aucune nouvelle notification</div>';
    return;
  }
  c.innerHTML = notifs.map(function(n){
    return '<a class="notif-item is-new" href="' + escHtml(n.target) + '">'
      + '<div class="notif-icon">' + n.icon + '</div>'
      + '<div class="notif-info">'
        + '<div class="notif-title">' + escHtml(n.title) + '</div>'
        + '<div class="notif-desc">' + escHtml(n.desc) + '</div>'
        + '<div class="notif-time">' + (typeof fmtDate === 'function' ? fmtDate(n.at) : n.at) + '</div>'
      + '</div>'
    + '</a>';
  }).join('');
}

function markAllNotifsRead(){
  localStorage.setItem('mc_admin_last_seen', String(Date.now()));
  refreshAdminNotifications();
  renderNotifsDropdown();
}

// Fermer le dropdown au clic en dehors
document.addEventListener('click', function(e){
  var wrap = document.getElementById('nav-notif-wrap');
  var dd = document.getElementById('nav-notif-dropdown');
  if (!wrap || !dd) return;
  if (!wrap.contains(e.target)) dd.classList.remove('open');
});

// Si on arrive sur contrats.html?view=ID, ouvrir directement la modale du contrat
// (sans toucher au timestamp des notifs : seul "Tout marquer lu" doit le faire)
(function(){
  if (location.pathname.indexOf('contrats.html') === -1 && document.body.dataset.page !== 'contrats') return;
  var params = new URLSearchParams(location.search);
  var viewId = params.get('view');
  if (!viewId) return;
  setTimeout(function(){
    var archTab = document.querySelector('.contract-tab[data-tab="archives"]');
    if (archTab) archTab.click();
    setTimeout(function(){ if (typeof viewArchive === 'function') viewArchive(viewId); }, 200);
  }, 400);
})();
// Plus de marquage auto au clic sur Admin : c'est la cloche qui gère "marquer comme lu"

// ===========================================================
// LOGS D'ACTIVITÉ
// ===========================================================
function getLogs(){
  try { return JSON.parse(localStorage.getItem(MC_LOGS_KEY) || '[]'); } catch(e){ return []; }
}
function logAction(action, details){
  var u = getCurrentUser();
  var logs = getLogs();
  logs.unshift({
    at: new Date().toISOString(),
    username: u ? u.username : '(anonyme)',
    displayName: u ? (u.displayName || u.username) : '(anonyme)',
    action: action,
    details: details || ''
  });
  // Limite à 500 entrées pour ne pas saturer
  if (logs.length > 500) logs = logs.slice(0, 500);
  try { localStorage.setItem(MC_LOGS_KEY, JSON.stringify(logs)); } catch(e){}
}
function clearAllLogs(){
  mcConfirm('Vider tout l\'historique d\'activité ?\n\nCette action est irréversible.', { title: '🗑 Vider les logs', okText: 'Vider' }).then(function(ok){
    if (!ok) return;
    localStorage.removeItem(MC_LOGS_KEY);
    renderAdminLogs();
    mcAlert('✓ Historique vidé.', { title: 'Succès' });
  });
}
function renderAdminLogs(){
  var c = document.getElementById('admin-logs-list');
  if (!c) return;
  var logs = getLogs();
  if (logs.length === 0){ c.innerHTML = '<div style="color:#6a7a8a;font-style:italic;padding:14px;text-align:center;background:#141926;border-radius:8px">Aucune activité enregistrée.</div>'; return; }
  c.innerHTML = '<div style="max-height:400px;overflow-y:auto;background:#141926;border-radius:8px;padding:8px">'
    + logs.slice(0, 100).map(function(l){
      return '<div style="padding:8px 10px;border-bottom:1px solid rgba(0,212,255,.08);display:flex;gap:10px;align-items:center;font-size:12px">'
        + '<span style="color:#6a7a8a;min-width:140px;font-family:monospace">' + new Date(l.at).toLocaleString('fr-FR') + '</span>'
        + '<span style="color:#f5c518;font-weight:600;min-width:120px">' + escHtml(l.displayName) + '</span>'
        + '<span style="color:#dce4f0;flex:1">' + escHtml(l.action) + '</span>'
        + '<span style="color:#aabbc8;font-style:italic">' + escHtml(l.details) + '</span>'
      + '</div>';
    }).join('') + '</div>'
    + '<div style="font-size:11px;color:#6a7a8a;margin-top:6px;text-align:center">Affichage des 100 dernières actions sur ' + logs.length + ' au total</div>';
}

// ===========================================================
// MOT DE PASSE OUBLIÉ (via question secrète)
// ===========================================================
var _forgotStep = 1;
var _forgotUser = null;
function openForgotModal(){
  _forgotStep = 1;
  _forgotUser = null;
  document.getElementById('forgot-modal').classList.add('active');
  document.getElementById('forgot-error').textContent = '';
  document.getElementById('forgot-username').value = '';
  document.getElementById('forgot-answer').value = '';
  document.getElementById('forgot-newpwd').value = '';
  document.getElementById('forgot-newpwd2').value = '';
  showForgotStep(1);
  setTimeout(function(){ document.getElementById('forgot-username').focus(); }, 60);
}
function closeForgotModal(){ document.getElementById('forgot-modal').classList.remove('active'); }
function showForgotStep(n){
  _forgotStep = n;
  document.getElementById('forgot-step-1').style.display = n === 1 ? '' : 'none';
  document.getElementById('forgot-step-2').style.display = n === 2 ? '' : 'none';
  document.getElementById('forgot-step-3').style.display = n === 3 ? '' : 'none';
  document.getElementById('forgot-title').textContent = 'Étape ' + n + '/3';
  document.getElementById('forgot-next-btn').textContent = n === 3 ? '🔑 Changer mon mot de passe' : 'Continuer →';
}
function forgotNext(){
  var err = document.getElementById('forgot-error');
  err.textContent = '';
  if (_forgotStep === 1){
    var u = (document.getElementById('forgot-username').value || '').trim();
    if (!u){ err.textContent = '⚠ Saisissez votre nom d\'utilisateur.'; return; }
    var users = getUsers();
    var user = users.find(function(x){ return x.username.toLowerCase() === u.toLowerCase(); });
    if (!user){ err.textContent = '⚠ Aucun compte trouvé avec ce nom.'; return; }
    if (!user.secretQuestion || !user.secretAnswer){
      err.textContent = '⚠ Ce compte n\'a pas de question secrète configurée.\nContactez l\'organisateur pour réinitialiser votre mot de passe.';
      return;
    }
    _forgotUser = user;
    document.getElementById('forgot-question-display').textContent = SECRET_QUESTIONS[user.secretQuestion] || user.secretQuestion;
    showForgotStep(2);
    setTimeout(function(){ document.getElementById('forgot-answer').focus(); }, 60);
  } else if (_forgotStep === 2){
    var ans = (document.getElementById('forgot-answer').value || '').trim();
    if (!ans){ err.textContent = '⚠ Saisissez votre réponse.'; return; }
    if (ans !== _forgotUser.secretAnswer){
      err.textContent = '⚠ Réponse incorrecte.';
      logAction('Tentative reset mdp échouée', _forgotUser.username);
      return;
    }
    showForgotStep(3);
    setTimeout(function(){ document.getElementById('forgot-newpwd').focus(); }, 60);
  } else if (_forgotStep === 3){
    var p1 = document.getElementById('forgot-newpwd').value || '';
    var p2 = document.getElementById('forgot-newpwd2').value || '';
    if (!p1){ err.textContent = '⚠ Saisissez un nouveau mot de passe.'; return; }
    if (p1.length < 4){ err.textContent = '⚠ Minimum 4 caractères.'; return; }
    if (p1 !== p2){ err.textContent = '⚠ Les mots de passe ne correspondent pas.'; return; }
    var users = getUsers();
    var idx = users.findIndex(function(x){ return x.username === _forgotUser.username; });
    if (idx === -1) return;
    users[idx].password = p1;
    saveUsers(users);
    logAction('Mot de passe réinitialisé via question secrète', _forgotUser.username);
    closeForgotModal();
    mcAlert('✓ Mot de passe réinitialisé avec succès.\nVous pouvez maintenant vous connecter.', { title: 'Succès' }).then(function(){
      openLoginModal();
      document.getElementById('login-username').value = _forgotUser.username;
      document.getElementById('login-password').focus();
    });
  }
}

// ===========================================================
// MON PROFIL (utilisateur connecté)
// ===========================================================
var _profilAvatarDataURL = '';
function showProfilSection(){
  var user = getCurrentUser();
  if (!user) return;
  document.getElementById('profil').style.display = '';
  document.getElementById('profil-username').value = user.username;
  document.getElementById('profil-displayname').value = user.displayName || '';
  document.getElementById('profil-avatar-preview').src = user.avatar || defaultAvatar(user.displayName || user.username);
  _profilAvatarDataURL = user.avatar || '';
  document.getElementById('profil-secret-question').value = user.secretQuestion || '';
  // Ne JAMAIS pré-remplir la réponse en clair (sécurité). Placeholder indique l'état.
  var sa = document.getElementById('profil-secret-answer');
  sa.value = '';
  sa.placeholder = user.secretAnswer ? '••••••• (déjà configurée — ressaisir pour modifier)' : 'Votre réponse';
  renderMyContrats();
  renderMyLogs();
}
function handleProfilAvatarUpload(ev){
  var file = ev.target.files[0];
  if (!file) return;
  if (file.size > 800 * 1024){ mcAlert('⚠ Image trop lourde (max 800 Ko).', { title: 'Erreur' }); return; }
  var reader = new FileReader();
  reader.onload = function(e){
    _profilAvatarDataURL = e.target.result;
    document.getElementById('profil-avatar-preview').src = _profilAvatarDataURL;
  };
  reader.readAsDataURL(file);
}
function saveMyProfile(){
  var user = getCurrentUser();
  if (!user) return;
  var dn = (document.getElementById('profil-displayname').value || '').trim();
  if (!dn){ mcAlert('⚠ Le nom affiché ne peut pas être vide.', { title: 'Erreur' }); return; }
  var users = getUsers();
  var idx = users.findIndex(function(x){ return x.username === user.username; });
  if (idx === -1) return;
  users[idx].displayName = dn;
  if (_profilAvatarDataURL) users[idx].avatar = _profilAvatarDataURL;
  saveUsers(users);
  logAction('Profil modifié', dn);
  mcAlert('✓ Profil mis à jour.\nLa page va se recharger.', { title: 'Succès' }).then(function(){ location.reload(); });
}
function changeMyPassword(){
  var user = getCurrentUser();
  if (!user) return;
  var oldP = document.getElementById('profil-oldpwd').value || '';
  var p1 = document.getElementById('profil-newpwd').value || '';
  var p2 = document.getElementById('profil-newpwd2').value || '';
  if (oldP !== user.password){ mcAlert('⚠ Mot de passe actuel incorrect.', { title: 'Erreur' }); return; }
  if (!p1 || p1.length < 4){ mcAlert('⚠ Le nouveau mot de passe doit faire au moins 4 caractères.', { title: 'Erreur' }); return; }
  if (p1 !== p2){ mcAlert('⚠ Les nouveaux mots de passe ne correspondent pas.', { title: 'Erreur' }); return; }
  var users = getUsers();
  var idx = users.findIndex(function(x){ return x.username === user.username; });
  if (idx === -1) return;
  users[idx].password = p1;
  saveUsers(users);
  logAction('Mot de passe modifié');
  document.getElementById('profil-oldpwd').value = '';
  document.getElementById('profil-newpwd').value = '';
  document.getElementById('profil-newpwd2').value = '';
  mcAlert('✓ Mot de passe modifié avec succès.', { title: 'Succès' });
}
function saveMySecret(){
  var user = getCurrentUser();
  if (!user) return;
  var q = document.getElementById('profil-secret-question').value;
  var a = (document.getElementById('profil-secret-answer').value || '').trim();
  if (!q){ mcAlert('⚠ Choisissez une question.', { title: 'Erreur' }); return; }
  if (!a){ mcAlert('⚠ Saisissez une réponse.', { title: 'Erreur' }); return; }
  var users = getUsers();
  var idx = users.findIndex(function(x){ return x.username === user.username; });
  if (idx === -1) return;
  users[idx].secretQuestion = q;
  users[idx].secretAnswer = a;
  saveUsers(users);
  logAction('Question secrète modifiée');
  // Vider la réponse après sauvegarde + remettre placeholder sécurisé
  var sa = document.getElementById('profil-secret-answer');
  sa.value = '';
  sa.placeholder = '••••••• (déjà configurée — ressaisir pour modifier)';
  mcAlert('✓ Question secrète enregistrée.\nVous pourrez l\'utiliser pour récupérer votre mot de passe.', { title: 'Succès' });
}
function renderMyContrats(){
  var c = document.getElementById('profil-mes-contrats');
  if (!c) return;
  var user = getCurrentUser();
  if (!user) return;
  var mine = getArchives().filter(function(r){
    return (r.partnerName || '').toLowerCase().indexOf((user.displayName || '').toLowerCase()) !== -1
        || (r.partnerName || '').toLowerCase().indexOf(user.username.toLowerCase()) !== -1;
  });
  if (mine.length === 0){ c.innerHTML = '<div style="color:#6a7a8a;font-style:italic;padding:14px;text-align:center;background:#141926;border-radius:8px">Aucun contrat enregistré à votre nom.</div>'; return; }
  c.innerHTML = '<div class="validated-list">' + mine.map(function(r){
    var meta = CONTRACT_LABELS[r.type] || { label: r.type, icon: '📄' };
    var statusBadge = r.status === 'pending'
      ? '<span class="status-badge status-pending">⏳ En attente</span>'
      : '<span class="status-badge status-validated">✓ Validé</span>';
    return '<div class="validated-item' + (r.status === 'pending' ? ' pending-item' : '') + '">'
      + '<div class="vi-icon">' + meta.icon + '</div>'
      + '<div class="vi-info">'
        + '<div class="vi-title">' + escHtml(meta.label) + ' ' + statusBadge + '</div>'
        + '<div class="vi-date">' + (r.validatedAt ? 'Validé le ' + fmtDate(r.validatedAt) : 'Soumis le ' + fmtDate(r.submittedAt || r.validatedAt)) + '</div>'
      + '</div>'
    + '</div>';
  }).join('') + '</div>';
}
function renderMyLogs(){
  var c = document.getElementById('profil-mes-logs');
  if (!c) return;
  var user = getCurrentUser();
  if (!user) return;
  var mine = getLogs().filter(function(l){ return l.username === user.username; }).slice(0, 50);
  if (mine.length === 0){ c.innerHTML = '<div style="color:#6a7a8a;font-style:italic;padding:14px;text-align:center;background:#141926;border-radius:8px">Aucune activité enregistrée.</div>'; return; }
  c.innerHTML = '<div style="max-height:300px;overflow-y:auto;background:#141926;border-radius:8px;padding:6px">'
    + mine.map(function(l){
      return '<div style="padding:7px 10px;border-bottom:1px solid rgba(0,212,255,.08);font-size:12px">'
        + '<span style="color:#6a7a8a;font-family:monospace">' + new Date(l.at).toLocaleString('fr-FR') + '</span> — '
        + '<span style="color:#dce4f0">' + escHtml(l.action) + '</span>'
        + (l.details ? ' <span style="color:#aabbc8;font-style:italic">(' + escHtml(l.details) + ')</span>' : '')
      + '</div>';
    }).join('') + '</div>';
}

// Au clic sur les home-cards (page accueil), bloquer si pas de perm
document.querySelectorAll('.home-card[data-perm]').forEach(function(card){
  card.addEventListener('click', function(e){
    var perm = card.dataset.perm;
    var u = getCurrentUser();
    if (u && (u.isAdmin || (u.perms || []).indexOf(perm) !== -1)) return;
    e.preventDefault();
    var msg = u
      ? 'Votre compte n\'a pas les permissions pour accéder à cette section.\n\nContactez l\'organisateur (BoulaTV).'
      : 'Cette section nécessite d\'être connecté avec un compte autorisé.';
    mcAlert(msg, { title: '🚫 Accès refusé' }).then(function(){
      if (!u && typeof openLoginModal === 'function') openLoginModal();
    });
  });
});

// ===========================================================
// MESSAGERIE PARTENAIRES → ADMIN
// ===========================================================
// ===========================================================
// MESSAGERIE BIDIRECTIONNELLE — système de threads
// ===========================================================
// Structure thread : { id, participants:[u1,u2], subject, entries:[{from,fromDisplay,fromAvatar,body,at,readBy:[]}], lastActivityAt }
// Résout l'avatar d'un username à la volée (évite de stocker du base64 volumineux dans chaque entry)
function resolveUserAvatar(username){
  if (!username) return defaultAvatar('?');
  try {
    var users = (typeof getUsers === 'function') ? getUsers() : [];
    var u = users.find(function(x){ return x.username === username; });
    if (u && u.avatar) return u.avatar;
    return defaultAvatar((u && u.displayName) || username);
  } catch(e){ return defaultAvatar(username); }
}
function resolveUserDisplay(username){
  if (!username) return '?';
  try {
    var users = (typeof getUsers === 'function') ? getUsers() : [];
    var u = users.find(function(x){ return x.username === username; });
    return (u && u.displayName) || username;
  } catch(e){ return username; }
}
function getMessages(){
  try {
    var raw = JSON.parse(localStorage.getItem(MC_MESSAGES_KEY) || '[]');
    // Migration : structure thread + purge des avatars stockés (saturent le quota)
    var migrated = false;
    raw = raw.map(function(m){
      if (m.entries){
        // Purge les avatars base64 stockés dans les entries (gain de place massif)
        var purged = false;
        m.entries.forEach(function(e){
          if (e.fromAvatar){ delete e.fromAvatar; purged = true; }
          if (e.fromDisplay){ delete e.fromDisplay; purged = true; }
        });
        if (purged) migrated = true;
        return m;
      }
      migrated = true;
      return {
        id: m.id,
        participants: [m.from, 'BoulaTV'],
        subject: m.subject,
        entries: [{
          from: m.from,
          body: m.body,
          at: m.sentAt,
          readBy: m.isRead ? ['BoulaTV'] : []
        }],
        lastActivityAt: m.sentAt,
        lastFrom: m.from
      };
    });
    if (migrated){
      try { localStorage.setItem(MC_MESSAGES_KEY, JSON.stringify(raw)); }
      catch(e){ console.warn('[MC] migration messages : storage saturé, pas de réécriture'); }
    }
    return raw;
  }
  catch(e){ return []; }
}
function saveMessages(list){
  localStorage.setItem(MC_MESSAGES_KEY, JSON.stringify(list));
  if (typeof refreshAdminNotifications === 'function') refreshAdminNotifications();
  if (typeof refreshUserMsgBadge === 'function') refreshUserMsgBadge();
}
// Filtre les threads visibles par l'utilisateur courant
function getVisibleThreads(){
  var u = getCurrentUser();
  if (!u) return [];
  var all = getMessages();
  if (u.username === 'BoulaTV' || userIsAdmin()) return all;
  return all.filter(function(t){ return t.participants && t.participants.indexOf(u.username) !== -1; });
}
function threadUnreadCountFor(thread, username){
  if (!thread || !thread.entries) return 0;
  return thread.entries.filter(function(e){
    return e.from !== username && (!e.readBy || e.readBy.indexOf(username) === -1);
  }).length;
}
// Marquer toutes les entries d'un thread comme lues par le user
function markThreadRead(threadId, username){
  var list = getMessages();
  var idx = list.findIndex(function(t){ return t.id === threadId; });
  if (idx === -1) return;
  var changed = false;
  list[idx].entries.forEach(function(e){
    if (!e.readBy) e.readBy = [];
    if (e.from !== username && e.readBy.indexOf(username) === -1){
      e.readBy.push(username);
      changed = true;
    }
  });
  if (changed) saveMessages(list);
}
// Modal "Nouveau message" (partenaires uniquement créent vers admin)
function openMessageModal(){
  var u = getCurrentUser();
  if (!u){ mcAlert('Vous devez être connecté pour envoyer un message.', { title: 'Connexion requise' }); return; }
  // Si le user a déjà des threads, on ouvre la boîte de réception. Sinon, le formulaire direct.
  var isAdmin = userIsAdmin();
  if (isAdmin){
    openInboxModal();
    return;
  }
  var threads = getVisibleThreads();
  if (threads.length > 0){ openInboxModal(); return; }
  openComposeModal();
}
function openComposeModal(){
  var subj = document.getElementById('msg-subject');
  var body = document.getElementById('msg-body');
  var err = document.getElementById('msg-error');
  if (subj) subj.value = '';
  if (body) body.value = '';
  if (err) err.textContent = '';
  document.getElementById('message-modal').classList.add('active');
  setTimeout(function(){ if (subj) subj.focus(); }, 60);
}
function closeMessageModal(){ document.getElementById('message-modal').classList.remove('active'); }
function sendMessage(){
  var u = getCurrentUser();
  if (!u) return;
  var subject = (document.getElementById('msg-subject').value || '').trim();
  var body = (document.getElementById('msg-body').value || '').trim();
  var err = document.getElementById('msg-error');
  if (!subject){ err.textContent = '⚠ Saisissez un sujet.'; return; }
  if (!body){ err.textContent = '⚠ Saisissez un message.'; return; }
  var list = getMessages();
  var now = new Date().toISOString();
  var thread = {
    id: 'T' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    participants: [u.username, 'BoulaTV'],
    subject: subject,
    entries: [{
      from: u.username,
      body: body,
      at: now,
      readBy: [u.username]
    }],
    lastActivityAt: now,
    lastFrom: u.username
  };
  list.unshift(thread);
  if (list.length > 200) list = list.slice(0, 200);
  saveMessages(list);
  logAction('Message envoyé à l\'organisateur', subject);
  closeMessageModal();
  mcAlert('✓ Message envoyé à l\'organisateur.\nIl recevra une notification.', { title: 'Message envoyé' });
}
// === Boîte de réception (liste de threads) ===
function openInboxModal(){
  document.getElementById('inbox-modal').classList.add('active');
  renderInbox();
}
function closeInboxModal(){ document.getElementById('inbox-modal').classList.remove('active'); }
function renderInbox(){
  var u = getCurrentUser();
  var c = document.getElementById('inbox-list');
  if (!c || !u) return;
  var threads = getVisibleThreads();
  threads.sort(function(a, b){ return new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0); });
  if (threads.length === 0){
    c.innerHTML = '<div style="color:#6a7a8a;font-style:italic;padding:14px;text-align:center;background:#141926;border-radius:8px">Aucun message pour le moment.</div>';
    return;
  }
  c.innerHTML = threads.map(function(t){
    var unread = threadUnreadCountFor(t, u.username);
    var lastEntry = t.entries[t.entries.length - 1] || {};
    var partner = userIsAdmin()
      ? (t.participants.find(function(p){ return p !== 'BoulaTV'; }) || t.participants[0])
      : 'BoulaTV';
    var partnerName = userIsAdmin() ? resolveUserDisplay(partner) : '🎯 BoulaTV (Organisateur)';
    var avatar = resolveUserAvatar(partner);
    var preview = (lastEntry.body || '').slice(0, 70) + ((lastEntry.body || '').length > 70 ? '…' : '');
    var prefix = lastEntry.from === u.username ? '✓ Vous : ' : '';
    return '<div class="message-item' + (unread > 0 ? '' : ' is-read') + '" onclick="openThread(\'' + t.id + '\')">'
      + '<img class="message-item-icon" src="' + avatar + '" style="border-radius:50%;width:36px;height:36px;object-fit:cover">'
      + '<div class="message-item-info">'
        + '<div class="message-item-from">' + escHtml(partnerName) + (unread > 0 ? ' <span style="background:#ff4757;color:#fff;border-radius:10px;padding:1px 8px;font-size:10px;margin-left:6px">' + unread + '</span>' : '') + '</div>'
        + '<div class="message-item-subject">' + escHtml(t.subject) + '</div>'
        + '<div class="message-item-preview">' + escHtml(prefix + preview) + '</div>'
        + '<div class="message-item-date">' + fmtDate(t.lastActivityAt) + '</div>'
      + '</div>'
      + (userIsAdmin() ? '<div class="message-item-actions"><button class="user-item-btn del" onclick="deleteThread(\'' + t.id + '\', event)">🗑</button></div>' : '')
    + '</div>';
  }).join('');
  // Bouton "nouveau" — seuls les non-admins peuvent créer un thread
  var newBtn = document.getElementById('inbox-new-btn');
  if (newBtn) newBtn.style.display = userIsAdmin() ? 'none' : '';
}
function deleteThread(id, ev){
  if (ev) ev.stopPropagation();
  if (!userIsAdmin()) return;
  mcConfirm('Supprimer cette conversation ?\n\nElle disparaîtra aussi côté partenaire.', { okText: 'Supprimer' }).then(function(ok){
    if (!ok) return;
    var list = getMessages().filter(function(t){ return t.id !== id; });
    saveMessages(list);
    renderInbox();
    if (typeof renderMessagesList === 'function') renderMessagesList();
  });
}
// === Vue thread (modal conversation) ===
var _currentThreadId = null;
function openThread(id){
  var u = getCurrentUser();
  if (!u) return;
  _currentThreadId = id;
  markThreadRead(id, u.username);
  renderThreadView();
  document.getElementById('msg-view-modal').classList.add('active');
  if (typeof renderInbox === 'function') renderInbox();
  if (typeof renderMessagesList === 'function') renderMessagesList();
}
function renderThreadView(){
  var u = getCurrentUser();
  if (!u) return;
  var list = getMessages();
  var t = list.find(function(x){ return x.id === _currentThreadId; });
  if (!t) return;
  // Header
  var partner = userIsAdmin()
    ? (t.participants.find(function(p){ return p !== 'BoulaTV'; }) || t.participants[0])
    : 'BoulaTV';
  var partnerDisplay = userIsAdmin() ? resolveUserDisplay(partner) : '🎯 BoulaTV (Organisateur)';
  var fromEl = document.getElementById('msg-view-from');
  if (fromEl) fromEl.textContent = userIsAdmin() ? ('Avec : ' + partnerDisplay + ' (@' + partner + ')') : ('Conversation avec : ' + partnerDisplay);
  var subjEl = document.getElementById('msg-view-subject');
  if (subjEl) subjEl.textContent = t.subject;
  var dateEl = document.getElementById('msg-view-date');
  if (dateEl) dateEl.textContent = 'Démarrée le ' + fmtDate(t.entries[0] ? t.entries[0].at : t.lastActivityAt);
  // Body : bulles
  var body = document.getElementById('msg-view-body');
  if (body){
    body.innerHTML = t.entries.map(function(e){
      var mine = e.from === u.username;
      var color = mine ? '#00e676' : '#00d4ff';
      var bg = mine ? 'rgba(0,230,118,.10)' : 'rgba(0,212,255,.10)';
      var border = mine ? 'rgba(0,230,118,.35)' : 'rgba(0,212,255,.35)';
      var align = mine ? 'flex-end' : 'flex-start';
      var label = mine ? 'Vous' : escHtml(resolveUserDisplay(e.from));
      return '<div style="display:flex;justify-content:' + align + ';margin-bottom:10px">'
        + '<div style="max-width:78%;background:' + bg + ';border:1px solid ' + border + ';border-radius:10px;padding:10px 12px">'
          + '<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:4px;font-size:11px;color:' + color + ';font-weight:600">'
            + '<span>' + label + '</span><span style="color:#6a7a8a;font-weight:400">' + fmtDate(e.at) + '</span>'
          + '</div>'
          + '<div style="color:#dce4f0;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word">' + escHtml(e.body) + '</div>'
        + '</div>'
      + '</div>';
    }).join('');
    body.scrollTop = body.scrollHeight;
  }
  var reply = document.getElementById('msg-reply-body');
  if (reply) reply.value = '';
  var err = document.getElementById('msg-reply-error');
  if (err) err.textContent = '';
}
function sendReply(){
  console.log('[MC] sendReply() appelée, threadId=', _currentThreadId);
  try {
    var u = getCurrentUser();
    if (!u){ console.warn('[MC] sendReply: pas de user'); return; }
    if (!_currentThreadId){ console.warn('[MC] sendReply: pas de threadId'); window.alert('⚠ Aucune conversation active. Rouvrez la conversation.'); return; }
    var bodyEl = document.getElementById('msg-reply-body');
    var err = document.getElementById('msg-reply-error');
    if (!bodyEl){ console.error('[MC] sendReply: msg-reply-body introuvable'); window.alert('⚠ Erreur interne (champ introuvable). Rechargez la page.'); return; }
    var body = (bodyEl.value || '').trim();
    if (!body){ if (err) err.textContent = '⚠ Saisissez un message.'; return; }
    var list = getMessages();
    var idx = list.findIndex(function(t){ return t.id === _currentThreadId; });
    if (idx === -1){ console.warn('[MC] thread introuvable'); return; }
    var now = new Date().toISOString();
    var subject = list[idx].subject;
    list[idx].entries.push({
      from: u.username,
      body: body,
      at: now,
      readBy: [u.username]
    });
    list[idx].lastActivityAt = now;
    list[idx].lastFrom = u.username;
    if (list[idx].participants.indexOf(u.username) === -1) list[idx].participants.push(u.username);
    saveMessages(list);
    if (typeof logAction === 'function') logAction('Réponse envoyée', subject);
    closeMsgViewModal();
    if (typeof renderInbox === 'function') renderInbox();
    if (typeof renderMessagesList === 'function') renderMessagesList();
    // Feedback : essaie mcAlert, fallback alert natif
    try {
      mcAlert('✓ Réponse envoyée.\n\nVotre interlocuteur recevra une notification.', { title: 'Message envoyé' });
    } catch(e){
      console.error('[MC] mcAlert a planté:', e);
      window.alert('✓ Réponse envoyée.');
    }
  } catch(e){
    console.error('[MC] sendReply ERREUR:', e);
    window.alert('⚠ Erreur lors de l\'envoi : ' + e.message);
  }
}
function closeMsgViewModal(){
  document.getElementById('msg-view-modal').classList.remove('active');
  _currentThreadId = null;
}
// === Liste admin (dans admin.html) ===
function renderMessagesList(){
  var c = document.getElementById('messages-list');
  if (!c) return;
  var u = getCurrentUser();
  if (!u) return;
  var list = getMessages();
  var unread = list.reduce(function(acc, t){ return acc + threadUnreadCountFor(t, u.username); }, 0);
  var badge = document.getElementById('msg-count-badge');
  if (badge){
    if (unread > 0){ badge.textContent = unread + ' non lu(s)'; badge.style.background = 'rgba(255,71,87,.18)'; badge.style.color = '#ff4757'; }
    else { badge.textContent = list.length; badge.style.background = 'rgba(0,212,255,.18)'; badge.style.color = '#00d4ff'; }
  }
  if (list.length === 0){ c.innerHTML = '<div style="color:#6a7a8a;font-style:italic;padding:14px;text-align:center;background:#141926;border-radius:8px">Aucune conversation.</div>'; return; }
  list.sort(function(a, b){ return new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0); });
  c.innerHTML = '<div class="messages-list">' + list.map(function(t){
    var unr = threadUnreadCountFor(t, u.username);
    var partner = t.participants.find(function(p){ return p !== 'BoulaTV'; }) || t.participants[0];
    var partnerName = resolveUserDisplay(partner);
    var partnerAvatar = resolveUserAvatar(partner);
    var lastEntry = t.entries[t.entries.length - 1] || {};
    var prefix = lastEntry.from === u.username ? '✓ Vous : ' : '';
    return '<div class="message-item' + (unr > 0 ? '' : ' is-read') + '" onclick="openThread(\'' + t.id + '\')">'
      + '<img class="message-item-icon" src="' + partnerAvatar + '" style="border-radius:50%;width:36px;height:36px;object-fit:cover">'
      + '<div class="message-item-info">'
        + '<div class="message-item-from">' + escHtml(partnerName) + ' <span style="color:#6a7a8a;font-weight:400;font-size:11px">@' + escHtml(partner) + '</span>' + (unr > 0 ? ' <span style="background:#ff4757;color:#fff;border-radius:10px;padding:1px 8px;font-size:10px;margin-left:6px">' + unr + '</span>' : '') + '</div>'
        + '<div class="message-item-subject">' + escHtml(t.subject) + ' <span style="color:#6a7a8a;font-weight:400;font-size:11px">(' + t.entries.length + ' message' + (t.entries.length > 1 ? 's' : '') + ')</span></div>'
        + '<div class="message-item-preview">' + escHtml(prefix + (lastEntry.body || '').slice(0, 80)) + ((lastEntry.body || '').length > 80 ? '…' : '') + '</div>'
        + '<div class="message-item-date">' + fmtDate(t.lastActivityAt) + '</div>'
      + '</div>'
      + '<div class="message-item-actions">'
        + '<button class="user-item-btn del" onclick="deleteThread(\'' + t.id + '\', event)">🗑</button>'
      + '</div>'
    + '</div>';
  }).join('') + '</div>';
}
// Badge non lu sur le bouton 📨 du nav (pour partenaires)
function refreshUserMsgBadge(){
  var u = getCurrentUser();
  var btn = document.getElementById('nav-msg-btn');
  if (!btn || !u) return;
  if (userIsAdmin()) return; // l'admin a déjà la cloche notifs
  var threads = getVisibleThreads();
  var unread = threads.reduce(function(acc, t){ return acc + threadUnreadCountFor(t, u.username); }, 0);
  // Affichage badge
  var existing = btn.querySelector('.msg-badge');
  if (unread > 0){
    if (!existing){
      var b = document.createElement('span');
      b.className = 'msg-badge';
      btn.appendChild(b);
      existing = b;
    }
    existing.textContent = unread > 99 ? '99+' : unread;
    existing.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#ff4757;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;line-height:1.2';
    btn.style.position = 'relative';
  } else if (existing){
    existing.remove();
  }
}

// ===========================================================
// FILTRAGE / RECHERCHE ARCHIVES
// ===========================================================
function resetArchFilters(){
  var s = document.getElementById('arch-search'); if (s) s.value = '';
  var st = document.getElementById('arch-status'); if (st) st.value = '';
  var t = document.getElementById('arch-type'); if (t) t.value = '';
  renderArchivesList();
}
function applyArchFilters(list){
  var s = ((document.getElementById('arch-search') || {}).value || '').toLowerCase().trim();
  var st = (document.getElementById('arch-status') || {}).value || '';
  var t = (document.getElementById('arch-type') || {}).value || '';
  return list.filter(function(r){
    if (s){
      var name = (r.partnerName || '').toLowerCase();
      var by = (r.createdByDisplay || '').toLowerCase();
      var login = (r.createdBy || '').toLowerCase();
      if (name.indexOf(s) === -1 && by.indexOf(s) === -1 && login.indexOf(s) === -1) return false;
    }
    if (st && (r.status || 'validated') !== st) return false;
    if (t && r.type !== t) return false;
    return true;
  });
}

// ===========================================================
// Affichage du bouton message dans la nav (si utilisateur connecté)
// ===========================================================
function updateMsgBtnVisibility(){
  var btn = document.getElementById('nav-msg-btn');
  if (!btn) return;
  var u = getCurrentUser();
  // Visible pour tous les users connectés sauf admin (qui reçoit, pas envoie)
  btn.style.display = (u && !u.isAdmin) ? '' : 'none';
}

// ===========================================================
// TEMPLATES — liste dans Admin + reset
// ===========================================================
function renderTemplatesList(){
  var c = document.getElementById('templates-list');
  if (!c) return;
  var list = getTemplates();
  if (list.length === 0){
    c.innerHTML = '<div style="color:#6a7a8a;font-style:italic;padding:14px;text-align:center;background:#141926;border-radius:8px">Aucun template (utilisez Restaurer pour récupérer les défauts).</div>';
    return;
  }
  var defaultIds = (typeof DEFAULT_CONTRACT_TEMPLATES !== 'undefined') ? DEFAULT_CONTRACT_TEMPLATES.map(function(d){ return d.id; }) : [];
  c.innerHTML = '<div class="users-list">' + list.map(function(t){
    var isDefault = defaultIds.indexOf(t.id) !== -1;
    var resetBtn = isDefault ? '<button class="user-item-btn edit" onclick="resetSingleTemplate(\'' + escHtml(t.id) + '\')" title="Restaurer la version par défaut de ce template">↺</button>' : '';
    return '<div class="user-item">'
      + '<div class="user-item-avatar" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:#0f1420;border:1px solid rgba(245,197,24,.4)">' + (t.icon || '📄') + '</div>'
      + '<div class="user-item-info">'
        + '<div class="user-item-name">' + escHtml(t.label) + (isDefault ? ' <span style="font-size:9px;color:#00d4ff;font-weight:700;letter-spacing:.5px;background:rgba(0,212,255,.12);padding:2px 6px;border-radius:6px;text-transform:uppercase;margin-left:4px">Défaut</span>' : ' <span style="font-size:9px;color:#f5c518;font-weight:700;letter-spacing:.5px;background:rgba(245,197,24,.12);padding:2px 6px;border-radius:6px;text-transform:uppercase;margin-left:4px">Custom</span>') + '</div>'
        + '<div class="user-item-login">@' + escHtml(t.id) + ' — ' + escHtml(t.ref) + '</div>'
        + '<div class="user-item-perms">' + (t.blocks || []).length + ' bloc(s)</div>'
      + '</div>'
      + '<div class="user-item-actions">'
        + '<a class="user-item-btn edit" href="template-editor.html?id=' + encodeURIComponent(t.id) + '" style="text-decoration:none">✎ Modifier</a>'
        + '<a class="user-item-btn edit" href="template-editor.html?clone=' + encodeURIComponent(t.id) + '" style="text-decoration:none">⎘ Dupliquer</a>'
        + resetBtn
        + '<button class="user-item-btn del" onclick="deleteTemplate(\'' + escHtml(t.id) + '\')">🗑</button>'
      + '</div>'
    + '</div>';
  }).join('') + '</div>';
}
// Restaurer UN SEUL template à sa version par défaut (sans toucher aux autres)
function resetSingleTemplate(id){
  if (typeof DEFAULT_CONTRACT_TEMPLATES === 'undefined'){
    mcAlert('⚠ Templates par défaut indisponibles.', { title: 'Erreur' });
    return;
  }
  var def = DEFAULT_CONTRACT_TEMPLATES.find(function(t){ return t.id === id; });
  if (!def){
    mcAlert('⚠ Aucune version par défaut pour ce template.\nIl s\'agit d\'un template personnalisé que vous avez créé.', { title: 'Pas de défaut' });
    return;
  }
  mcConfirm('Restaurer le template « ' + def.label + ' » à sa version par défaut ?\n\nVos modifications sur ce template seront perdues, mais les autres templates ne seront pas affectés.\nLes contrats déjà signés ne changent pas.', { title: '↺ Restaurer ce template', okText: 'Restaurer' })
    .then(function(ok){
      if (!ok) return;
      var list = getTemplates();
      var idx = list.findIndex(function(t){ return t.id === id; });
      // Deep clone du template par défaut pour éviter les references partagées
      var cloned = JSON.parse(JSON.stringify(def));
      if (idx === -1) list.push(cloned);
      else list[idx] = cloned;
      saveTemplates(list);
      renderTemplatesList();
      logAction('Template restauré au défaut', def.label);
      mcAlert('✓ Template « ' + def.label + ' » restauré à sa version par défaut.', { title: 'Succès' });
    });
}

function deleteTemplate(id){
  mcConfirm('Supprimer le template "' + id + '" ?\n\nLes contrats déjà signés référençant ce template restent visibles dans les archives.\n\nCette action est irréversible.', { title: '🗑 Supprimer template', okText: 'Supprimer' })
    .then(function(ok){
      if (!ok) return;
      var list = getTemplates().filter(function(t){ return t.id !== id; });
      saveTemplates(list);
      renderTemplatesList();
      logAction('Template supprimé', id);
      mcAlert('✓ Template supprimé.', { title: 'Succès' });
    });
}
function resetTplsToDefault(){
  mcConfirm('⚠ Restaurer tous les templates par défaut ?\n\nCela écrase TOUTES les modifications que vous avez faites sur les contrats.\n\nLes contrats déjà signés ne sont PAS affectés.', { title: '↺ Restaurer', okText: 'Restaurer' })
    .then(function(ok){
      if (!ok) return;
      resetTemplatesToDefault();
      renderTemplatesList();
      logAction('Templates restaurés au défaut');
      mcAlert('✓ Templates restaurés.', { title: 'Succès' });
    });
}

// Rendre la liste templates au chargement de admin (et à l'ouverture de l'onglet)
(function(){
  if (document.body.dataset.page === 'admin'){
    setTimeout(renderTemplatesList, 200);
  }
})();

// ===========================================================
// PARTICIPANTS — inscription, liste, tirage Manche 1
// ===========================================================
function getParticipants(){
  try { return JSON.parse(localStorage.getItem(MC_PARTICIPANTS_KEY) || '[]'); } catch(e){ return []; }
}
function saveParticipants(list){ localStorage.setItem(MC_PARTICIPANTS_KEY, JSON.stringify(list)); }

function getRegistrationsOpen(){
  var v = localStorage.getItem(MC_REGISTRATIONS_OPEN_KEY);
  return v === '1';  // fermé par défaut
}
function setRegistrationsOpen(open){
  localStorage.setItem(MC_REGISTRATIONS_OPEN_KEY, open ? '1' : '0');
  if (typeof logAction === 'function') logAction('Inscriptions ' + (open ? 'ouvertes' : 'fermées'));
  // Refresh éventuellement la page participants si on y est
  if (typeof renderParticipantsList === 'function') renderParticipantsList();
}
function getMyParticipantInscription(){
  var u = getCurrentUser();
  if (!u) return null;
  return getParticipants().find(function(p){ return p.username === u.username; }) || null;
}

var _editingParticipantId = null;
function openParticipantModal(id){
  _editingParticipantId = id || null;
  var modal = document.getElementById('participant-modal');
  if (!modal) return;
  var u = getCurrentUser();
  if (!u){ mcAlert('Vous devez être connecté pour vous inscrire.', { title: 'Connexion requise' }); return; }
  var isAdmin = userIsAdmin();
  document.getElementById('part-error').textContent = '';
  // Section admin (statut + notes) visible uniquement pour admin
  document.getElementById('part-admin-section').style.display = isAdmin ? '' : 'none';
  if (id){
    var p = getParticipants().find(function(x){ return x.id === id; });
    if (!p) return;
    // Vérifier permissions : admin OU c'est sa propre inscription
    if (!isAdmin && p.username !== u.username){
      mcAlert('🚫 Vous ne pouvez modifier que votre propre inscription.', { title: 'Accès refusé' });
      return;
    }
    document.getElementById('part-modal-sub').textContent = 'Modifier l\'inscription';
    document.getElementById('part-modal-title').textContent = 'Édition de l\'inscription';
    document.getElementById('part-ingameid').value = p.inGameId || '';
    document.getElementById('part-firstname').value = p.firstName || '';
    document.getElementById('part-lastname').value = p.lastName || '';
    document.getElementById('part-phone').value = p.phone || '';
    document.getElementById('part-iban').value = p.iban || '';
    document.getElementById('part-status').value = p.status || 'pending';
    document.getElementById('part-notes').value = p.notes || '';
  } else {
    // Nouveau : vérifier inscriptions ouvertes (sauf admin) + pas déjà inscrit
    if (!isAdmin && !getRegistrationsOpen()){
      mcAlert('🔒 Les inscriptions ne sont pas encore ouvertes.\n\nL\'organisateur les ouvrira au moment voulu. Restez à l\'écoute !', { title: 'Inscriptions fermées' });
      return;
    }
    var existing = getMyParticipantInscription();
    if (existing && !isAdmin){
      mcAlert('Vous êtes déjà inscrit. Vous pouvez modifier vos informations à tout moment.', { title: 'Déjà inscrit' });
      _editingParticipantId = existing.id;
      return openParticipantModal(existing.id);
    }
    var list = getParticipants();
    if (list.length >= PARTICIPANTS_LIMIT){
      mcAlert('⚠ Les ' + PARTICIPANTS_LIMIT + ' places sont déjà attribuées.\n\nL\'organisateur peut désinscrire un participant absent.', { title: 'Inscriptions complètes' });
      return;
    }
    document.getElementById('part-modal-sub').textContent = isAdmin ? 'Inscrire un participant' : 'Mon inscription au quiz';
    document.getElementById('part-modal-title').textContent = 'Nouvelle inscription';
    document.getElementById('part-ingameid').value = '';
    document.getElementById('part-firstname').value = '';
    document.getElementById('part-lastname').value = '';
    document.getElementById('part-phone').value = '';
    document.getElementById('part-iban').value = '';
    document.getElementById('part-status').value = isAdmin ? 'confirmed' : 'pending';
    document.getElementById('part-notes').value = '';
  }
  modal.classList.add('active');
  setTimeout(function(){ document.getElementById('part-ingameid').focus(); }, 60);
}
function closeParticipantModal(){
  var m = document.getElementById('participant-modal');
  if (m) m.classList.remove('active');
}
function fetchPublicIP(){
  // Renvoie une promesse résolue avec l'IP publique, ou null si échec.
  return new Promise(function(resolve){
    try {
      var done = false;
      var timer = setTimeout(function(){ if (!done){ done = true; resolve(null); } }, 4000);
      fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(j){
          if (done) return;
          done = true; clearTimeout(timer);
          resolve(j && j.ip ? j.ip : null);
        })
        .catch(function(){
          if (done) return;
          done = true; clearTimeout(timer);
          resolve(null);
        });
    } catch (e){ resolve(null); }
  });
}
function saveParticipant(){
  var u = getCurrentUser();
  if (!u){ mcAlert('Connexion requise.'); return; }
  var isAdmin = userIsAdmin();
  var ig = (document.getElementById('part-ingameid').value || '').trim();
  var fn = (document.getElementById('part-firstname').value || '').trim();
  var ln = (document.getElementById('part-lastname').value || '').trim();
  var ph = (document.getElementById('part-phone').value || '').trim();
  var ib = (document.getElementById('part-iban').value || '').trim().replace(/\s+/g, '');
  var st = document.getElementById('part-status').value;
  var nt = (document.getElementById('part-notes').value || '').trim();
  var err = document.getElementById('part-error');
  if (!ig){ err.textContent = '⚠ ID en jeu obligatoire.'; return; }
  if (!fn || !ln){ err.textContent = '⚠ Prénom et nom in-game obligatoires.'; return; }
  if (!ph){ err.textContent = '⚠ Téléphone in-game obligatoire.'; return; }
  // Validation format téléphone XXX-XXXX
  if (!/^\d{3}-\d{4}$/.test(ph)){ err.textContent = '⚠ Format téléphone invalide. Attendu : XXX-XXXX (ex: 555-1234).'; return; }
  if (!ib){ err.textContent = '⚠ IBAN obligatoire (pour les récompenses).'; return; }
  var list = getParticipants();
  // Sécurité supplémentaire : 1 inscription par compte (sauf admin qui inscrit pour quelqu'un d'autre)
  if (!_editingParticipantId && !isAdmin){
    var existing = list.find(function(x){ return x.username === u.username; });
    if (existing){
      err.textContent = '⚠ Vous avez déjà une inscription. Modifiez-la au lieu d\'en créer une nouvelle.';
      return;
    }
  }
  err.textContent = '';
  // Récupère l'IP publique (anti-multi-comptes), puis enregistre.
  fetchPublicIP().then(function(ip){
    var list2 = getParticipants();
    // Anti-multi-comptes : 1 inscription par IP (sauf admin)
    if (!_editingParticipantId && !isAdmin && ip){
      var sameIP = list2.find(function(x){ return x.ip === ip; });
      if (sameIP){
        err.textContent = '⚠ Une inscription existe déjà depuis cette adresse IP. Une seule inscription est autorisée par foyer/connexion.';
        return;
      }
    }
    var fullName = fn + ' ' + ln;
    if (_editingParticipantId){
      var idx = list2.findIndex(function(x){ return x.id === _editingParticipantId; });
      if (idx === -1) return;
      list2[idx].inGameId = ig;
      list2[idx].firstName = fn;
      list2[idx].lastName = ln;
      list2[idx].fullName = fullName;
      list2[idx].pseudo = ig;
      list2[idx].phone = ph;
      list2[idx].iban = ib;
      if (isAdmin){
        list2[idx].status = st;
        list2[idx].notes = nt;
      }
    } else {
      if (list2.length >= PARTICIPANTS_LIMIT){ err.textContent = '⚠ Les ' + PARTICIPANTS_LIMIT + ' places sont déjà prises.'; return; }
      list2.push({
        id: 'P' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        username: u.username,
        inGameId: ig,
        firstName: fn,
        lastName: ln,
        fullName: fullName,
        pseudo: ig,
        phone: ph,
        iban: ib,
        ip: ip || null,
        status: isAdmin ? st : 'pending',
        notes: isAdmin ? nt : '',
        registeredAt: new Date().toISOString(),
        registeredBy: u.username,
        group: null,
        position: null
      });
    }
    saveParticipants(list2);
    if (typeof logAction === 'function') logAction(_editingParticipantId ? 'Inscription modifiée' : 'Inscription au quiz', fullName);
    closeParticipantModal();
    renderParticipantsList();
    if (!_editingParticipantId){
      mcAlert('✓ Inscription enregistrée !\n\nVotre place est en attente de validation par l\'organisateur. Vous serez inclus(e) dans le tirage une fois validé(e).', { title: 'Inscription reçue' });
    }
  });
}
function deleteParticipant(id){
  var p = getParticipants().find(function(x){ return x.id === id; });
  if (!p) return;
  mcConfirm('Désinscrire « ' + p.fullName + ' » ?\n\nCette action est irréversible.', { title: '🗑 Désinscrire', okText: 'Désinscrire' }).then(function(ok){
    if (!ok) return;
    var list = getParticipants().filter(function(x){ return x.id !== id; });
    saveParticipants(list);
    if (typeof logAction === 'function') logAction('Participant désinscrit', p.fullName);
    renderParticipantsList();
  });
}
function confirmParticipant(id){
  if (!userIsAdmin()){ mcAlert('🚫 Action réservée à l\'administrateur.'); return; }
  var list = getParticipants();
  var p = list.find(function(x){ return x.id === id; });
  if (!p) return;
  mcConfirm('✓ Confirmer l\'inscription de « ' + p.fullName + ' » ?\n\nCe participant sera inclus dans le prochain tirage.', { title: 'Confirmer l\'inscription', okText: 'Confirmer' }).then(function(ok){
    if (!ok) return;
    p.status = 'confirmed';
    p.confirmedAt = Date.now();
    saveParticipants(list);
    if (typeof logAction === 'function') logAction('Inscription confirmée', p.fullName);
    renderParticipantsList();
  });
}
function renderPartButtons(){
  var bar = document.getElementById('part-buttons-bar');
  if (!bar) return;
  var u = getCurrentUser();
  var isAdmin = userIsAdmin();
  var open = getRegistrationsOpen();
  var mine = u ? getMyParticipantInscription() : null;
  var html = '';
  if (!u){
    html = '<button class="admin-btn admin-btn-secondary" onclick="openLoginModal()">🔐 Se connecter pour s\'inscrire</button>';
  } else if (isAdmin){
    html = '<button class="admin-btn" onclick="openParticipantModal()">➕ Inscrire un participant</button>'
         + '<button class="admin-btn admin-btn-secondary" onclick="launchDrawAnimation()">🎲 Lancer le tirage Manche 1</button>';
    // Toggle inscriptions ouvertes
    html += '<label style="display:inline-flex;align-items:center;gap:8px;background:#141926;padding:8px 14px;border-radius:8px;border:1px solid ' + (open ? '#00e676' : '#ff4757') + ';color:' + (open ? '#00e676' : '#ff4757') + ';font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;font-family:Montserrat,sans-serif">'
         + '<input type="checkbox" ' + (open ? 'checked' : '') + ' onchange="setRegistrationsOpen(this.checked);renderPartButtons()" style="cursor:pointer;width:18px;height:18px">'
         + (open ? '🟢 Inscriptions ouvertes' : '🔴 Inscriptions fermées')
         + '</label>';
  } else if (mine){
    html = '<button class="admin-btn" onclick="openParticipantModal(\'' + mine.id + '\')">✎ Modifier mes infos</button>'
         + '<div style="display:inline-flex;align-items:center;padding:8px 14px;background:rgba(0,230,118,.12);border:1px solid #00e676;border-radius:8px;color:#00e676;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase">✓ Inscrit ' + (mine.group ? '— Groupe ' + mine.group : '') + '</div>';
  } else if (open){
    html = '<button class="admin-btn" onclick="openParticipantModal()">➕ S\'inscrire au quiz</button>';
  } else {
    html = '<div style="padding:14px 18px;background:rgba(255,71,87,.08);border:1px dashed #ff4757;border-radius:8px;color:#ff4757;font-weight:700">🔒 Les inscriptions ne sont pas encore ouvertes. Restez à l\'écoute !</div>';
  }
  bar.innerHTML = html;
}

function renderParticipantsList(){
  renderPartButtons();
  var c = document.getElementById('participants-list');
  if (!c) return;
  var list = getParticipants();
  // Maj barre de progression
  var bar = document.getElementById('part-progress-bar');
  var txt = document.getElementById('part-progress-text');
  if (bar && txt){
    var pct = Math.min(100, (list.length / PARTICIPANTS_LIMIT) * 100);
    bar.style.width = pct + '%';
    txt.textContent = list.length + ' / ' + PARTICIPANTS_LIMIT;
  }
  // Filtres
  var s = (document.getElementById('part-search') || {}).value || '';
  var fStatus = (document.getElementById('part-filter-status') || {}).value || '';
  var fGroup = (document.getElementById('part-filter-group') || {}).value || '';
  var filtered = list.filter(function(p){
    if (s){
      var q = s.toLowerCase();
      if ((p.fullName || '').toLowerCase().indexOf(q) === -1 && (p.pseudo || '').toLowerCase().indexOf(q) === -1) return false;
    }
    if (fStatus && p.status !== fStatus) return false;
    if (fGroup === 'none' && p.group) return false;
    if (fGroup && fGroup !== 'none' && p.group !== fGroup) return false;
    return true;
  });
  if (filtered.length === 0){
    c.innerHTML = '<div class="validated-empty">' + (list.length === 0 ? 'Aucun inscrit pour le moment.' : 'Aucun participant ne correspond aux filtres.') + '</div>';
    return;
  }
  // Affichage des groupes si tirage fait
  var hasGroups = list.some(function(p){ return !!p.group; });
  if (hasGroups){
    document.getElementById('groups-display-card').style.display = '';
    renderGroupsDisplay(list);
  } else {
    document.getElementById('groups-display-card').style.display = 'none';
  }
  var isAdmin = userIsAdmin();
  var u = getCurrentUser();
  c.innerHTML = '<div class="users-list">' + filtered.map(function(p, idx){
    var isOwn = u && p.username === u.username;
    var groupBadge = p.group ? '<span class="status-badge" style="background:rgba(0,212,255,.15);color:#00d4ff;border:1px solid rgba(0,212,255,.4);margin-left:6px">Groupe ' + p.group + (p.position ? ' #' + p.position : '') + '</span>' : '';
    var statusColor = p.status === 'confirmed' ? 'rgba(0,230,118,.15);color:#00e676;border:1px solid rgba(0,230,118,.4)'
                    : p.status === 'pending' ? 'rgba(245,197,24,.12);color:#f5c518;border:1px solid rgba(245,197,24,.3)'
                    : p.status === 'absent' ? 'rgba(255,82,82,.12);color:#ff5252;border:1px solid rgba(255,82,82,.3)'
                    : 'rgba(0,212,255,.12);color:#00d4ff;border:1px solid rgba(0,212,255,.3)';
    var statusBadge = '<span class="status-badge" style="margin-left:6px;background:' + statusColor + '">' + (STATUS_LABELS[p.status] || p.status) + '</span>';
    var ownBadge = isOwn ? '<span class="status-badge" style="margin-left:6px;background:rgba(0,230,118,.15);color:#00e676;border:1px solid rgba(0,230,118,.4)">⭐ vous</span>' : '';
    var displayName = escHtml(p.firstName + ' ' + p.lastName);
    var detailLine = '';
    if (isAdmin || isOwn){
      detailLine = '<div class="user-item-perms" style="color:#aabbc8;font-size:11px">'
        + '🎮 ID: ' + escHtml(p.inGameId || '—') + ' &nbsp;·&nbsp; 📞 ' + escHtml(p.phone || '—')
        + (isAdmin ? ' &nbsp;·&nbsp; 💳 ' + escHtml(p.iban || '—') : '')
        + (isAdmin && p.ip ? ' &nbsp;·&nbsp; 🌐 <span class="ip-blur" onclick="this.classList.toggle(\'revealed\')" title="Cliquer pour afficher / masquer l\'IP">' + escHtml(p.ip) + '</span>' : '')
        + '</div>';
    }
    var actions = '';
    if (isAdmin){
      if (p.status === 'pending'){
        actions += '<button class="user-item-btn edit" style="background:rgba(0,230,118,.15);border-color:rgba(0,230,118,.5);color:#00e676" onclick="confirmParticipant(\'' + p.id + '\')">✓ Confirmer</button>';
      }
      actions += '<button class="user-item-btn edit" onclick="openParticipantModal(\'' + p.id + '\')">✎ Modifier</button>'
              + '<button class="user-item-btn del" onclick="deleteParticipant(\'' + p.id + '\')">🗑</button>';
    } else if (isOwn){
      actions = '<button class="user-item-btn edit" onclick="openParticipantModal(\'' + p.id + '\')">✎ Modifier mes infos</button>';
    }
    return '<div class="user-item' + (isOwn ? ' admin-item' : '') + '">'
      + '<div class="user-item-avatar" style="display:flex;align-items:center;justify-content:center;font-size:18px;background:#0f1420;border:1px solid rgba(0,212,255,.4);color:#00d4ff;font-weight:700">' + (idx+1) + '</div>'
      + '<div class="user-item-info">'
        + '<div class="user-item-name">' + displayName + statusBadge + groupBadge + ownBadge + '</div>'
        + detailLine
        + (p.notes && isAdmin ? '<div class="user-item-perms" style="color:#aabbc8;font-style:italic">📝 ' + escHtml(p.notes) + '</div>' : '')
      + '</div>'
      + (actions ? '<div class="user-item-actions">' + actions + '</div>' : '')
    + '</div>';
  }).join('') + '</div>';
}
function renderGroupsDisplay(list){
  if (!list && typeof getParticipants === 'function') list = getParticipants();
  if (!list || !list.forEach) return;
  var c = document.getElementById('groups-display');
  if (!c) return; // l'élément n'existe que sur participants.html
  var groups = { A: [], B: [], C: [] };
  list.forEach(function(p){
    if (p.group && groups[p.group]) groups[p.group].push(p);
  });
  Object.keys(groups).forEach(function(g){
    groups[g].sort(function(a, b){ return (a.position || 0) - (b.position || 0); });
  });
  var colors = { A: '#00d4ff', B: '#f5c518', C: '#00e676' };
  c.innerHTML = ['A', 'B', 'C'].map(function(g){
    var color = colors[g];
    return '<div style="background:#141926;border:1px solid ' + color + ';border-radius:10px;padding:14px">'
      + '<h4 style="color:' + color + ';margin:0 0 10px;text-align:center;letter-spacing:2px;font-size:18px">GROUPE ' + g + ' <span style="font-size:11px;color:#aabbc8">(' + groups[g].length + ')</span></h4>'
      + '<ol style="margin:0;padding-left:24px;color:#dce4f0;font-size:13px">'
      + groups[g].map(function(p){ return '<li style="margin-bottom:4px">' + escHtml(p.fullName) + (p.pseudo ? ' <span style="color:#6a7a8a">(' + escHtml(p.pseudo) + ')</span>' : '') + '</li>'; }).join('')
      + '</ol>'
    + '</div>';
  }).join('');
}

// ===== TIRAGE M1 — animation et répartition =====
function launchDrawAnimation(){
  if (!userIsAdmin()){
    mcAlert('🚫 Le tirage est réservé à l\'administrateur.', { title: 'Accès refusé' });
    return;
  }
  var list = getParticipants();
  // Ne tire que les confirmés (les pending doivent être validés par l'admin avant)
  var pool = list.filter(function(p){ return p.status === 'confirmed'; });
  var pendingCount = list.filter(function(p){ return p.status === 'pending'; }).length;
  if (pool.length < 3){
    var msg = '⚠ Il faut au moins 3 participants confirmés pour faire le tirage.\nActuellement : ' + pool.length + ' confirmé(s).';
    if (pendingCount > 0) msg += '\n\n⏳ ' + pendingCount + ' inscription(s) en attente de validation. Cliquez sur ✓ Confirmer pour les valider.';
    mcAlert(msg, { title: 'Pas assez de participants confirmés' });
    return;
  }
  var extra = pendingCount > 0 ? '\n\n⚠ ' + pendingCount + ' inscription(s) en attente NE seront PAS incluses (à confirmer avant).' : '';
  mcConfirm('🎲 Lancer le tirage des groupes Manche 1 ?\n\n' + pool.length + ' participant(s) confirmé(s) seront répartis en 3 groupes (A, B, C) de manière aléatoire.' + extra + '\n\nUn tirage existant sera écrasé.', { title: 'Tirage Manche 1', okText: 'Lancer' }).then(function(ok){
    if (!ok) return;
    runDrawAnimation(pool);
  });
}
function runDrawAnimation(pool){
  // Mélanger
  var shuffled = pool.slice().sort(function(){ return Math.random() - 0.5; });
  // Répartir en 3 groupes équilibrés (round-robin)
  var groups = { A: [], B: [], C: [] };
  shuffled.forEach(function(p, i){
    var g = ['A', 'B', 'C'][i % 3];
    p.group = g;
    p.position = groups[g].length + 1;
    groups[g].push(p);
  });
  // Sauvegarder
  var fullList = getParticipants();
  fullList.forEach(function(p){
    var inPool = pool.find(function(x){ return x.id === p.id; });
    if (inPool){ p.group = inPool.group; p.position = inPool.position; }
  });
  saveParticipants(fullList);
  if (typeof logAction === 'function') logAction('Tirage Manche 1 effectué', pool.length + ' participants');
  // Animation : afficher les noms qui défilent puis se fixent
  showDrawOverlay(groups);
}
function showDrawOverlay(groups){
  // Crée un overlay plein écran avec animation
  var ov = document.createElement('div');
  ov.id = 'draw-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,26,.97);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;overflow-y:auto;backdrop-filter:blur(8px)';
  ov.innerHTML = '<div style="text-align:center;margin-bottom:30px">'
    + '<h1 style="font-size:36px;background:linear-gradient(135deg,#00d4ff,#f5c518);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px;letter-spacing:3px">🎲 TIRAGE EN COURS</h1>'
    + '<p style="color:#aabbc8;font-size:14px" id="draw-status">Mélange des participants…</p>'
    + '</div>'
    + '<div id="draw-groups" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:1000px;width:100%"></div>'
    + '<button id="draw-close-btn" style="margin-top:30px;padding:14px 32px;background:linear-gradient(135deg,#00e676,#00d4ff);color:#0a0e1a;border:none;border-radius:10px;font-weight:800;font-size:14px;letter-spacing:2px;cursor:pointer;font-family:inherit;text-transform:uppercase;display:none" onclick="closeDrawOverlay()">✓ Voir les groupes</button>';
  document.body.appendChild(ov);
  var colors = { A: '#00d4ff', B: '#f5c518', C: '#00e676' };
  var c = document.getElementById('draw-groups');
  c.innerHTML = ['A', 'B', 'C'].map(function(g){
    var color = colors[g];
    return '<div style="background:#141926;border:2px solid ' + color + ';border-radius:14px;padding:18px;min-height:200px">'
      + '<h2 style="color:' + color + ';text-align:center;margin:0 0 14px;letter-spacing:3px;font-size:24px;text-shadow:0 0 12px ' + color + '40">GROUPE ' + g + '</h2>'
      + '<ol id="draw-list-' + g + '" style="margin:0;padding-left:24px;color:#dce4f0;font-size:13px;min-height:120px"></ol>'
    + '</div>';
  }).join('');
  // Animation : ajouter les noms un par un avec délai
  var allParticipants = [];
  ['A', 'B', 'C'].forEach(function(g){
    groups[g].forEach(function(p){ allParticipants.push({ p: p, g: g }); });
  });
  // Mélanger pour ordre d'apparition aléatoire
  allParticipants.sort(function(){ return Math.random() - 0.5; });
  var i = 0;
  var status = document.getElementById('draw-status');
  function tick(){
    if (i >= allParticipants.length){
      status.textContent = '✓ Tirage terminé — ' + allParticipants.length + ' participants répartis';
      var btn = document.getElementById('draw-close-btn');
      if (btn) btn.style.display = '';
      return;
    }
    var item = allParticipants[i];
    var li = document.createElement('li');
    li.style.cssText = 'margin-bottom:5px;animation:draw-pop .4s ease-out';
    li.textContent = item.p.fullName + (item.p.pseudo ? ' (' + item.p.pseudo + ')' : '');
    document.getElementById('draw-list-' + item.g).appendChild(li);
    status.textContent = '→ ' + item.p.fullName + ' rejoint le Groupe ' + item.g + '…';
    i++;
    setTimeout(tick, 250 + Math.random() * 150);
  }
  setTimeout(tick, 600);
}
function closeDrawOverlay(){
  var ov = document.getElementById('draw-overlay');
  if (ov) ov.remove();
  renderParticipantsList();
}
function resetDraw(){
  if (!userIsAdmin()) return;
  mcConfirm('Réinitialiser le tirage ?\nLes participants ne seront plus assignés à un groupe.', { okText: 'Réinitialiser' }).then(function(ok){
    if (!ok) return;
    var list = getParticipants();
    list.forEach(function(p){ p.group = null; p.position = null; });
    saveParticipants(list);
    renderParticipantsList();
    if (typeof logAction === 'function') logAction('Tirage Manche 1 réinitialisé');
  });
}

// Init participants
(function(){
  if (document.body.dataset.page === 'participants'){
    setTimeout(renderParticipantsList, 100);
  }
  if (document.body.dataset.page === 'budget'){
    setTimeout(renderBudget, 100);
  }
})();

// ===========================================================
// BUDGET — Prévu vs Réel + suivi par bénéficiaire
// ===========================================================
var MC_BUDGET_KEY = 'mc_budget_v1';
var MC_BUDGET_ALLOC_KEY = 'mc_budget_alloc_v1';
function defaultBudget(){
  return {
    sections: [
      {
        id: 'm1',
        title: 'Manche 1 — 30 éliminés (chacun reçoit les 3 bons)',
        type: 'rounds',
        defaultQty: 30,
        items: [
          { id: 'm1-coif', name: 'Bon coiffure', unitPlanned: 300, qty: 30 },
          { id: 'm1-rep',  name: 'Bon réparation', unitPlanned: 650, qty: 30 },
          { id: 'm1-rep10',name: 'Bon repas (10 menus)', unitPlanned: 1100, qty: 30 }
        ]
      },
      {
        id: 'm2',
        title: 'Manche 2 — 8 éliminés (chacun reçoit les 4 bons)',
        type: 'rounds',
        defaultQty: 8,
        items: [
          { id: 'm2-rep10',name: 'Bon repas (10 menus)', unitPlanned: 1100, qty: 8 },
          { id: 'm2-rep', name: 'Bon réparation', unitPlanned: 650, qty: 8 },
          { id: 'm2-est', name: 'Bon esthétique (coiffure 300 + tatouage ~500)', unitPlanned: 800, qty: 8 },
          { id: 'm2-mfa', name: 'Bon stage pilotage MFA (15 min)', unitPlanned: 1000, qty: 8 }
        ]
      },
      {
        id: 'm3',
        title: 'Manche 3 — 4 finalistes',
        type: 'rounds',
        defaultQty: 4,
        items: [
          { id: 'm3-base', name: 'Base commune (Package M2 + VIP GP4 + Hélico Maze)', unitPlanned: 5550, qty: 4 },
          { id: 'm3-prime3', name: 'Prime 3ᵉ place', unitPlanned: 10000, qty: 1 },
          { id: 'm3-prime2', name: 'Prime 2ᵉ place', unitPlanned: 20000, qty: 1 },
          { id: 'm3-prime1', name: 'Prime 1er — Grand Vainqueur', unitPlanned: 40000, qty: 1 }
        ]
      },
      {
        id: 'prod',
        title: 'Frais production & événement',
        type: 'fixed',
        items: [
          { id: 'prod-studio',  name: 'Location studio',                   unitPlanned: 15000,  unitReal: 0 },
          { id: 'prod-real',    name: 'Réalisation & production',          unitPlanned: 100000, unitReal: 0 },
          { id: 'prod-annex',   name: 'Frais annexes (logistique, com, imprévus)', unitPlanned: 20000, unitReal: 0 }
        ]
      }
    ]
  };
}
function getBudget(){
  try {
    var raw = JSON.parse(localStorage.getItem(MC_BUDGET_KEY) || 'null');
    if (!raw) return defaultBudget();
    return raw;
  } catch(e){ return defaultBudget(); }
}
function saveBudget(b){
  localStorage.setItem(MC_BUDGET_KEY, JSON.stringify(b));
}
function getBudgetAllocs(){
  try { return JSON.parse(localStorage.getItem(MC_BUDGET_ALLOC_KEY) || '{}'); }
  catch(e){ return {}; }
}
function saveBudgetAllocs(a){
  localStorage.setItem(MC_BUDGET_ALLOC_KEY, JSON.stringify(a));
}
function fmtMoney(n){
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('fr-FR') + ' $';
}
// Calcule le total réel d'un item à partir des allocations
function itemRealTotal(item){
  if (item.unitReal !== undefined){
    // section fixed (production)
    return (item.unitReal || 0);
  }
  // sections rounds : somme des allocations distribuées
  var allocs = getBudgetAllocs();
  var total = 0;
  Object.keys(allocs).forEach(function(k){
    if (k.indexOf('::' + item.id) !== -1){
      var a = allocs[k];
      if (a.distributed){
        total += (a.amount !== undefined ? a.amount : (item.unitPlanned || 0));
      }
    }
  });
  return total;
}
function itemPaidTotal(item){
  if (item.unitReal !== undefined) return (item.unitReal || 0);
  var allocs = getBudgetAllocs();
  var total = 0;
  Object.keys(allocs).forEach(function(k){
    if (k.indexOf('::' + item.id) !== -1){
      var a = allocs[k];
      if (a.distributed && a.paid){
        total += (a.amount !== undefined ? a.amount : (item.unitPlanned || 0));
      }
    }
  });
  return total;
}
function itemPlannedTotal(item){
  return (item.unitPlanned || 0) * (item.qty || 1);
}
function sectionPlannedTotal(s){
  return s.items.reduce(function(acc, it){ return acc + itemPlannedTotal(it); }, 0);
}
function sectionRealTotal(s){
  return s.items.reduce(function(acc, it){ return acc + itemRealTotal(it); }, 0);
}
function sectionPaidTotal(s){
  return s.items.reduce(function(acc, it){ return acc + itemPaidTotal(it); }, 0);
}
function renderBudget(){
  var c = document.getElementById('budget-container');
  if (!c) return;
  var b = getBudget();
  var isAdmin = userIsAdmin();
  var html = '';
  // Bandeau d'aide + actions admin
  if (isAdmin){
    html += '<div class="budget-admin-bar">'
      + '<span style="color:#aabbc8">👑 Mode édition activé. Cliquez sur les valeurs pour les modifier.</span>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        + '<button class="modal-btn modal-btn-secondary" onclick="addBudgetItem()">+ Ajouter une ligne</button>'
        + '<button class="modal-btn modal-btn-secondary" onclick="resetBudget()" style="border-color:rgba(255,71,87,.4);color:#ff7a8c">↺ Réinitialiser</button>'
      + '</div>'
    + '</div>';
  } else {
    html += '<blockquote>📊 Vue lecture seule. Seul l\'organisateur peut modifier les valeurs.</blockquote>';
  }
  // Sections
  b.sections.forEach(function(s){
    html += renderBudgetSection(s, isAdmin);
  });
  // Suivi par bénéficiaire (sections rounds uniquement)
  html += renderBudgetBeneficiaries(b, isAdmin);
  // Récap
  html += renderBudgetSummary(b);
  c.innerHTML = html;
}
function renderBudgetSection(s, isAdmin){
  var planned = sectionPlannedTotal(s);
  var real = sectionRealTotal(s);
  var paid = sectionPaidTotal(s);
  var diff = real - planned;
  var diffColor = diff > 0 ? '#ff5252' : (diff < 0 ? '#00e676' : '#aabbc8');
  var diffSign = diff > 0 ? '+' : '';
  var rows = s.items.map(function(it){
    var pTotal = itemPlannedTotal(it);
    var rTotal = itemRealTotal(it);
    var pdTotal = itemPaidTotal(it);
    var nameCell = isAdmin
      ? '<input class="budget-edit budget-edit-text" value="' + escHtml(it.name) + '" onchange="updateBudgetItem(\'' + s.id + '\',\'' + it.id + '\',\'name\',this.value)">'
      : escHtml(it.name);
    var unitCell = isAdmin
      ? '<input class="budget-edit budget-edit-num" type="number" min="0" step="50" value="' + (it.unitPlanned || 0) + '" onchange="updateBudgetItem(\'' + s.id + '\',\'' + it.id + '\',\'unitPlanned\',this.value)">'
      : fmtMoney(it.unitPlanned || 0);
    var qtyCell = '';
    if (s.type === 'rounds'){
      qtyCell = isAdmin
        ? '<input class="budget-edit budget-edit-qty" type="number" min="0" step="1" value="' + (it.qty || 0) + '" onchange="updateBudgetItem(\'' + s.id + '\',\'' + it.id + '\',\'qty\',this.value)">'
        : '× ' + (it.qty || 0);
    }
    var realCell = '';
    if (s.type === 'fixed' && isAdmin){
      realCell = '<input class="budget-edit budget-edit-num" type="number" min="0" step="50" value="' + (it.unitReal || 0) + '" onchange="updateBudgetItem(\'' + s.id + '\',\'' + it.id + '\',\'unitReal\',this.value)">';
    } else if (s.type === 'fixed'){
      realCell = fmtMoney(it.unitReal || 0);
    } else {
      // rounds : total réel calculé
      realCell = '<span style="color:' + (rTotal === pTotal ? '#aabbc8' : (rTotal > pTotal ? '#ff5252' : '#00e676')) + '">' + fmtMoney(rTotal) + '</span>'
              + (pdTotal !== rTotal ? '<br><span style="font-size:10px;color:#6a7a8a">dont ' + fmtMoney(pdTotal) + ' payé</span>' : '');
    }
    var delBtn = isAdmin ? '<button class="budget-del" onclick="deleteBudgetItem(\'' + s.id + '\',\'' + it.id + '\')">🗑</button>' : '';
    return '<tr>'
      + '<td>' + nameCell + '</td>'
      + '<td>' + unitCell + '</td>'
      + (s.type === 'rounds' ? '<td>' + qtyCell + '</td>' : '')
      + '<td>' + fmtMoney(pTotal) + '</td>'
      + '<td>' + realCell + '</td>'
      + (isAdmin ? '<td>' + delBtn + '</td>' : '')
    + '</tr>';
  }).join('');
  var totalRow = '<tr class="total-row">'
    + '<td><strong>Sous-total</strong></td>'
    + '<td></td>'
    + (s.type === 'rounds' ? '<td></td>' : '')
    + '<td><strong>' + fmtMoney(planned) + '</strong></td>'
    + '<td><strong style="color:' + diffColor + '">' + fmtMoney(real) + '</strong>'
      + (planned > 0 ? '<br><span style="font-size:10px;color:' + diffColor + '">(' + diffSign + fmtMoney(diff) + ')</span>' : '')
    + '</td>'
    + (isAdmin ? '<td></td>' : '')
  + '</tr>';
  var titleEdit = isAdmin
    ? '<input class="budget-edit budget-edit-title" value="' + escHtml(s.title) + '" onchange="updateBudgetSection(\'' + s.id + '\',\'title\',this.value)">'
    : escHtml(s.title);
  return '<div class="budget-section">'
    + '<h3>' + titleEdit + '</h3>'
    + '<div class="table-wrap"><table class="budget-table"><thead><tr>'
      + '<th>Poste</th><th>Prévu unit.</th>'
      + (s.type === 'rounds' ? '<th>Quantité</th>' : '')
      + '<th>Total prévu</th>'
      + '<th>Total réel</th>'
      + (isAdmin ? '<th></th>' : '')
    + '</tr></thead><tbody>'
      + rows + totalRow
    + '</tbody></table></div>'
  + '</div>';
}
function renderBudgetBeneficiaries(b, isAdmin){
  // Section dynamique listant tous les participants éliminés/qualifiés et permettant de cocher les bons distribués
  var participants = (typeof getParticipants === 'function') ? getParticipants() : [];
  // On ne montre que les rounds (m1, m2, m3) dans cette vue
  var roundSections = b.sections.filter(function(s){ return s.type === 'rounds'; });
  if (participants.length === 0){
    return '<div class="budget-section"><h3>Suivi des bons distribués par bénéficiaire</h3>'
      + '<blockquote>Aucun participant inscrit pour le moment. Les bons à distribuer apparaîtront ici une fois le tirage et les éliminations effectués.</blockquote>'
    + '</div>';
  }
  var allocs = getBudgetAllocs();
  var rows = participants.map(function(p){
    return roundSections.map(function(s){
      return s.items.map(function(it){
        var key = p.id + '::' + it.id;
        var a = allocs[key] || {};
        var distributed = !!a.distributed;
        var paid = !!a.paid;
        var amount = a.amount !== undefined ? a.amount : (it.unitPlanned || 0);
        var distAttr = distributed ? 'checked' : '';
        var paidAttr = paid ? 'checked' : '';
        var disabledAttr = isAdmin ? '' : 'disabled';
        var amountInput = isAdmin
          ? '<input class="budget-edit budget-edit-num" type="number" min="0" step="50" value="' + amount + '" onchange="updateAlloc(\'' + p.id + '\',\'' + it.id + '\',\'amount\',this.value)">'
          : fmtMoney(amount);
        return '<tr class="' + (distributed ? '' : 'budget-row-pending') + '">'
          + '<td>' + escHtml(p.fullName || (p.firstName + ' ' + p.lastName)) + '<br><span style="font-size:10px;color:#6a7a8a">' + (STATUS_LABELS[p.status] || p.status) + '</span></td>'
          + '<td>' + s.id.toUpperCase() + ' — ' + escHtml(it.name) + '</td>'
          + '<td>' + amountInput + '</td>'
          + '<td><label class="budget-check"><input type="checkbox" ' + distAttr + ' ' + disabledAttr + ' onchange="updateAlloc(\'' + p.id + '\',\'' + it.id + '\',\'distributed\',this.checked)"> distribué</label></td>'
          + '<td><label class="budget-check"><input type="checkbox" ' + paidAttr + ' ' + disabledAttr + ' onchange="updateAlloc(\'' + p.id + '\',\'' + it.id + '\',\'paid\',this.checked)"> payé</label></td>'
        + '</tr>';
      }).join('');
    }).join('');
  }).join('');
  return '<div class="budget-section">'
    + '<h3>📋 Suivi des bons par bénéficiaire</h3>'
    + '<p style="color:#aabbc8;font-size:13px">Cochez « distribué » pour comptabiliser dans le total réel. Cochez « payé » pour suivre les règlements effectifs.</p>'
    + '<div class="table-wrap" style="max-height:500px;overflow-y:auto"><table class="budget-table"><thead><tr>'
      + '<th>Participant</th><th>Bon</th><th>Montant réel</th><th>Distribué ?</th><th>Payé ?</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
  + '</div>';
}
function renderBudgetSummary(b){
  var totalPlanned = b.sections.reduce(function(acc, s){ return acc + sectionPlannedTotal(s); }, 0);
  var totalReal = b.sections.reduce(function(acc, s){ return acc + sectionRealTotal(s); }, 0);
  var totalPaid = b.sections.reduce(function(acc, s){ return acc + sectionPaidTotal(s); }, 0);
  var diff = totalReal - totalPlanned;
  var diffColor = diff > 0 ? '#ff5252' : (diff < 0 ? '#00e676' : '#aabbc8');
  var diffLabel = diff > 0 ? 'Dépassement' : (diff < 0 ? 'Économie' : 'Conforme');
  var diffSign = diff > 0 ? '+' : '';
  var rows = b.sections.map(function(s){
    var sp = sectionPlannedTotal(s);
    var sr = sectionRealTotal(s);
    var sd = sr - sp;
    var sc = sd > 0 ? '#ff5252' : (sd < 0 ? '#00e676' : '#aabbc8');
    return '<tr><td>' + escHtml(s.title) + '</td>'
      + '<td>' + fmtMoney(sp) + '</td>'
      + '<td style="color:' + sc + '">' + fmtMoney(sr) + '</td>'
      + '<td style="color:' + sc + '">' + (sd === 0 ? '—' : ((sd > 0 ? '+' : '') + fmtMoney(sd))) + '</td>'
    + '</tr>';
  }).join('');
  return '<div class="budget-section">'
    + '<h3>📊 Récapitulatif général</h3>'
    + '<div class="table-wrap"><table class="budget-table"><thead><tr>'
      + '<th>Poste</th><th>Prévu</th><th>Réel</th><th>Écart</th>'
    + '</tr></thead><tbody>' + rows
    + '<tr class="total-row"><td><strong>TOTAL</strong></td>'
      + '<td><strong>' + fmtMoney(totalPlanned) + '</strong></td>'
      + '<td style="color:' + diffColor + '"><strong>' + fmtMoney(totalReal) + '</strong></td>'
      + '<td style="color:' + diffColor + '"><strong>' + (diff === 0 ? '—' : (diffSign + fmtMoney(diff))) + '</strong></td>'
    + '</tr>'
    + '</tbody></table></div>'
    + '<div class="budget-summary-grid">'
      + '<div class="budget-stat"><div class="budget-stat-label">Total prévu</div><div class="budget-stat-value">' + fmtMoney(totalPlanned) + '</div></div>'
      + '<div class="budget-stat"><div class="budget-stat-label">Total réel distribué</div><div class="budget-stat-value" style="color:' + diffColor + '">' + fmtMoney(totalReal) + '</div></div>'
      + '<div class="budget-stat"><div class="budget-stat-label">Effectivement payé</div><div class="budget-stat-value" style="color:#f5c518">' + fmtMoney(totalPaid) + '</div></div>'
      + '<div class="budget-stat"><div class="budget-stat-label">Écart vs prévu</div><div class="budget-stat-value" style="color:' + diffColor + '">' + diffLabel + '<br><span style="font-size:14px">' + (diff === 0 ? '—' : (diffSign + fmtMoney(diff))) + '</span></div></div>'
    + '</div>'
    + '<blockquote>💡 Les valeurs sont mises à jour en temps réel à mesure que les bons sont distribués et payés aux participants.</blockquote>'
  + '</div>';
}
function updateBudgetItem(sectionId, itemId, field, value){
  if (!userIsAdmin()) return;
  var b = getBudget();
  var s = b.sections.find(function(x){ return x.id === sectionId; });
  if (!s) return;
  var it = s.items.find(function(x){ return x.id === itemId; });
  if (!it) return;
  if (field === 'name'){ it.name = (value || '').trim() || 'Sans nom'; }
  else { it[field] = parseFloat(value) || 0; }
  saveBudget(b);
  renderBudget();
}
function updateBudgetSection(sectionId, field, value){
  if (!userIsAdmin()) return;
  var b = getBudget();
  var s = b.sections.find(function(x){ return x.id === sectionId; });
  if (!s) return;
  s[field] = (value || '').trim();
  saveBudget(b);
  renderBudget();
}
function addBudgetItem(){
  if (!userIsAdmin()) return;
  var b = getBudget();
  var sectionIds = b.sections.map(function(s){ return s.id; }).join(', ');
  mcPrompt('Dans quelle section ajouter une ligne ?\n\nSections disponibles : ' + sectionIds, {
    title: 'Ajouter une ligne',
    placeholder: 'ex: m1',
    okText: 'Continuer'
  }).then(function(sid){
    if (!sid) return;
    sid = sid.trim().toLowerCase();
    var s = b.sections.find(function(x){ return x.id === sid; });
    if (!s){ mcAlert('Section introuvable : ' + sid); return; }
    var newItem = {
      id: sid + '-' + Date.now().toString(36),
      name: 'Nouveau poste',
      unitPlanned: 0
    };
    if (s.type === 'rounds') newItem.qty = s.defaultQty || 1;
    if (s.type === 'fixed') newItem.unitReal = 0;
    s.items.push(newItem);
    saveBudget(b);
    renderBudget();
  });
}
function deleteBudgetItem(sectionId, itemId){
  if (!userIsAdmin()) return;
  mcConfirm('Supprimer cette ligne du budget ?', { okText: 'Supprimer' }).then(function(ok){
    if (!ok) return;
    var b = getBudget();
    var s = b.sections.find(function(x){ return x.id === sectionId; });
    if (!s) return;
    s.items = s.items.filter(function(x){ return x.id !== itemId; });
    // Nettoyer les allocations associées
    var allocs = getBudgetAllocs();
    Object.keys(allocs).forEach(function(k){ if (k.indexOf('::' + itemId) !== -1) delete allocs[k]; });
    saveBudgetAllocs(allocs);
    saveBudget(b);
    renderBudget();
  });
}
function resetBudget(){
  if (!userIsAdmin()) return;
  mcConfirm('⚠ Réinitialiser le budget aux valeurs par défaut ?\n\nLes allocations par bénéficiaire seront aussi effacées.\n\nAction irréversible.', { okText: 'Réinitialiser' }).then(function(ok){
    if (!ok) return;
    try { localStorage.removeItem(MC_BUDGET_KEY); } catch(e){}
    try { localStorage.removeItem(MC_BUDGET_ALLOC_KEY); } catch(e){}
    renderBudget();
    mcAlert('✓ Budget réinitialisé.');
  });
}
function updateAlloc(participantId, itemId, field, value){
  if (!userIsAdmin()) return;
  var allocs = getBudgetAllocs();
  var key = participantId + '::' + itemId;
  if (!allocs[key]) allocs[key] = { distributed: false, paid: false };
  if (field === 'amount') allocs[key].amount = parseFloat(value) || 0;
  else allocs[key][field] = !!value;
  if (field === 'paid' && value && !allocs[key].distributed){
    allocs[key].distributed = true; // payé implique distribué
  }
  if (field === 'paid' && value){ allocs[key].paidAt = new Date().toISOString(); }
  saveBudgetAllocs(allocs);
  renderBudget();
}

// Init au chargement
renderAllContractPanels();  // Génère dynamiquement les panels de contrats à partir des templates (page contrats uniquement)
checkPageAccess();
applyAuthState();
refreshAdminNotifications();
updateMsgBtnVisibility();
refreshUserMsgBadge();
renderMessagesList();

// Re-authentification Firebase nominale automatique si une session legacy existe
// Nécessaire car certains navigateurs (Opera GX, CEF FiveM) ne persistent pas
// la session Firebase Auth entre les chargements de page → l'utilisateur
// retombe en mode anonyme et les règles Firestore strictes bloquent ses
// opérations.
function autoReauthFromLegacy(){
  if (!window.MC_FB || !MC_FB.available || !MC_FB.auth) return;
  var localUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!localUser) return;
  if (!MC_FB.auth.currentUser) return;
  if (!MC_FB.auth.currentUser.isAnonymous) return; // déjà nominal
  if (typeof MC_DATA === 'undefined') return;
  MC_DATA.get('users', localUser.username).then(function(u){
    if (!u || !u.password) return;
    var email = u.email || (u.username.toLowerCase() + '@masterclash.local');
    MC_FB.auth.signInWithEmailAndPassword(email, u.password)
      .then(function(){ console.log('[MC_AUTH] Re-auth nominal :', u.username); })
      .catch(function(err){
        if (err && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials')){
          MC_FB.auth.createUserWithEmailAndPassword(email, u.password)
            .then(function(){ console.log('[MC_AUTH] Compte Firebase créé pour', u.username); })
            .catch(function(e){ console.warn('[MC_AUTH] create:', e && e.code); });
        } else {
          console.warn('[MC_AUTH] re-auth:', err && err.code);
        }
      });
  });
}
if (window.MC_FB && MC_FB.ready){
  MC_FB.ready.then(function(){ setTimeout(autoReauthFromLegacy, 200); });
}
// Login modal : Enter = submit
document.getElementById('login-password').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); doLogin(); } });
document.getElementById('login-username').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); document.getElementById('login-password').focus(); } });

// ===========================================================
// DIALOGUE CUSTOM (remplace alert/confirm/prompt — compatible CEF FiveM)
// ===========================================================
function _dlgEls(){
  return {
    modal: document.getElementById('dlg-modal'),
    icon: document.getElementById('dlg-icon'),
    title: document.getElementById('dlg-title'),
    msg: document.getElementById('dlg-msg'),
    input: document.getElementById('dlg-input'),
    error: document.getElementById('dlg-error'),
    ok: document.getElementById('dlg-ok'),
    cancel: document.getElementById('dlg-cancel')
  };
}
function _dlgClose(){ _dlgEls().modal.classList.remove('active'); }
function _dlgOpen(opts){
  return new Promise(function(resolve){
    var e = _dlgEls();
    e.icon.textContent = opts.icon || '⚡ MASTER CLASH';
    e.title.textContent = opts.title || 'Information';
    e.msg.innerHTML = String(opts.message || '').replace(/\n/g, '<br>');
    e.error.textContent = '';
    if (opts.showInput){
      e.input.style.display = '';
      e.input.type = opts.inputType || 'text';
      e.input.value = opts.defaultValue || '';
      e.input.placeholder = opts.placeholder || '';
    } else {
      e.input.style.display = 'none';
    }
    if (opts.showCancel){
      e.cancel.style.display = '';
      e.cancel.textContent = opts.cancelText || 'Annuler';
    } else {
      e.cancel.style.display = 'none';
    }
    e.ok.textContent = opts.okText || 'Valider';
    var doOk = function(){
      var v = opts.showInput ? e.input.value : true;
      if (opts.validate){
        var err = opts.validate(v);
        if (err){ e.error.textContent = err; return; }
      }
      _dlgClose();
      resolve(opts.showInput ? v : true);
    };
    var doCancel = function(){ _dlgClose(); resolve(opts.showInput ? null : false); };
    e.ok.onclick = doOk;
    e.cancel.onclick = doCancel;
    e.input.onkeydown = function(ev){ if (ev.key === 'Enter'){ ev.preventDefault(); doOk(); } };
    e.modal.classList.add('active');
    if (opts.showInput) setTimeout(function(){ e.input.focus(); }, 60);
  });
}
function mcAlert(message, opts){
  opts = opts || {};
  return _dlgOpen({ icon: opts.icon || '⚡ MASTER CLASH', title: opts.title || 'Information', message: message, okText: opts.okText || 'OK' });
}
function mcConfirm(message, opts){
  opts = opts || {};
  return _dlgOpen({ icon: opts.icon || '⚡ MASTER CLASH', title: opts.title || 'Confirmation', message: message, showCancel: true, okText: opts.okText || 'Confirmer' });
}
function mcPrompt(message, opts){
  opts = opts || {};
  return _dlgOpen({
    icon: opts.icon || '⚡ MASTER CLASH',
    title: opts.title || 'Saisie',
    message: message,
    showInput: true,
    showCancel: true,
    inputType: opts.inputType || 'text',
    placeholder: opts.placeholder || '',
    defaultValue: opts.defaultValue || '',
    okText: opts.okText || 'Valider',
    validate: opts.validate
  });
}

var CONTRACT_LABELS = {
  est:  { label: 'Contrat Esthétique',     icon: '💆', ref: 'MC-EST-2026'  },
  gar:  { label: 'Contrat Garage',         icon: '🔧', ref: 'MC-GAR-2026'  },
  res:  { label: 'Contrat Restaurant',     icon: '🍽️', ref: 'MC-RES-2026'  },
  maze: { label: 'Contrat Maze Event',     icon: '🚁', ref: 'MC-MAZE-2026' },
  mfa:  { label: 'Contrat MFA Pilotage',   icon: '🏎️', ref: 'MC-MFA-2026'  }
};

// ===== VERROU PAR CODE =====
(function(){
  var unlocked = localStorage.getItem(MC_UNLOCK_KEY) === '1';
  var pendingTarget = null;
  var modal = document.getElementById('mc-modal');
  var input = document.getElementById('mc-code-input');
  var err = document.getElementById('mc-code-error');
  var form = document.getElementById('mc-code-form');
  var cancelBtn = document.getElementById('mc-code-cancel');

  function applyUnlockState(){
    if (unlocked){
      document.querySelectorAll('.locked-content').forEach(function(el){ el.classList.remove('locked'); });
      document.querySelectorAll('.lock-overlay').forEach(function(el){ el.style.display = 'none'; });
      document.querySelectorAll('.locked-link').forEach(function(el){
        el.classList.remove('locked-link');
        var lockSpan = el.querySelector('.lock-icon');
        if (lockSpan) lockSpan.remove();
      });
    }
  }
  function showAccessDenied(sectionId){
    var user = getCurrentUser();
    var msg, title;
    if (!user){
      title = '🔐 Connexion requise';
      msg = 'Cette section est réservée aux utilisateurs autorisés.\n\nConnectez-vous ou créez un compte pour demander l\'accès auprès de l\'organisateur.';
    } else {
      title = '🚫 Accès refusé';
      msg = 'Votre compte « ' + (user.displayName || user.username) + ' » n\'a pas les permissions nécessaires pour accéder à cette section.\n\nContactez l\'organisateur (BoulaTV) pour demander un accès.';
    }
    mcAlert(msg, { title: title }).then(function(){
      if (!user) openLoginModal();
    });
  }
  document.querySelectorAll('.locked-link').forEach(function(link){
    link.addEventListener('click', function(e){
      var section = link.getAttribute('data-section');
      // Si l'utilisateur connecté a la permission ou est admin, laisser passer le clic (scroll vers la section)
      if (userIsAdmin() || userHasPerm(section)) return;
      e.preventDefault();
      showAccessDenied(section);
    });
  });
  document.querySelectorAll('.lock-overlay').forEach(function(ov){
    ov.addEventListener('click', function(e){
      var section = ov.getAttribute('data-section');
      if (userIsAdmin() || userHasPerm(section)) return;
      e.preventDefault();
      showAccessDenied(section);
    });
  });
  // Anciennes fonctions de modale code (conservées pour compatibilité, plus utilisées pour les sections)
  function closeModal(){ modal.classList.remove('active'); err.textContent = ''; input.value = ''; }
  if (form) form.addEventListener('submit', function(e){ e.preventDefault(); closeModal(); });
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    var vm = document.getElementById('view-modal');
    if (e.key === 'Escape' && vm && vm.classList.contains('active')) closeViewModal();
  });
  applyUnlockState();
})();

// ===== ONGLETS CONTRATS =====
document.querySelectorAll('.contract-tab').forEach(function(tab){
  tab.addEventListener('click', function(){
    var target = tab.getAttribute('data-tab');
    document.querySelectorAll('.contract-tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.contract-panel').forEach(function(p){ p.classList.remove('active'); });
    tab.classList.add('active');
    var panel = document.getElementById('panel-' + target);
    if (panel) panel.classList.add('active');
    if (target === 'archives') renderArchivesList();
  });
});

// ===== SIGNATURE CANVAS =====
function initSigCanvas(canvas){
  if (canvas.dataset.sigInit) return;
  canvas.dataset.sigInit = '1';
  var ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#1a1612';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  var drawing = false;
  function pos(e){
    var r = canvas.getBoundingClientRect();
    return [
      (e.clientX - r.left) * (canvas.width / r.width),
      (e.clientY - r.top) * (canvas.height / r.height)
    ];
  }
  canvas.addEventListener('pointerdown', function(e){
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch(_){}
    drawing = true;
    var p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
  });
  canvas.addEventListener('pointermove', function(e){
    if (!drawing) return;
    var p = pos(e);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  });
  canvas.addEventListener('pointerup', function(){ drawing = false; });
  canvas.addEventListener('pointercancel', function(){ drawing = false; });
  canvas.addEventListener('pointerleave', function(){ drawing = false; });
}
document.querySelectorAll('.sig-canvas').forEach(initSigCanvas);

// Retirer le highlight rouge dès que l'utilisateur tape dans un champ marqué
document.addEventListener('input', function(e){
  if (e.target && e.target.classList && e.target.classList.contains('field-missing')){
    if ((e.target.value || '').trim()) e.target.classList.remove('field-missing');
  }
});

// Au chargement : verrouiller la zone Organisateur dans tous les contrats actifs
// (le partenaire ne doit pas pouvoir y signer ni y écrire)
document.querySelectorAll('.contract-panel:not(#panel-bons):not(#panel-archives) .contract-doc .signature-block .signature-col:first-child').forEach(function(col){
  col.querySelectorAll('input, textarea').forEach(function(el){
    el.setAttribute('disabled', 'disabled');
    el.setAttribute('readonly', 'readonly');
    el.classList.add('org-locked-input');
  });
  var canvas = col.querySelector('canvas.sig-canvas');
  if (canvas){
    canvas.classList.add('org-locked-canvas');
  }
  var clearBtn = col.querySelector('.sig-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  if (!col.querySelector('.org-locked-msg')){
    var msg = document.createElement('div');
    msg.className = 'org-locked-msg';
    msg.textContent = '⚠ Zone réservée à l\'organisateur — sera complétée après réception';
    col.insertBefore(msg, col.firstChild);
  }
});

function clearSig(btn){
  var wrap = btn.closest('.sig-wrap');
  if (!wrap) return;
  var cv = wrap.querySelector('canvas.sig-canvas');
  if (!cv) return;
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
}
function isCanvasBlank(canvas){
  var ctx = canvas.getContext('2d');
  var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (var i = 3; i < data.length; i += 4){ if (data[i] !== 0) return false; }
  return true;
}

// ===== ARCHIVES =====
function getArchives(){
  try { return JSON.parse(localStorage.getItem(MC_ARCHIVE_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveArchives(list){
  localStorage.setItem(MC_ARCHIVE_KEY, JSON.stringify(list));
  updateArchivesCount();
  if (typeof refreshAdminNotifications === 'function') refreshAdminNotifications();
}
function updateArchivesCount(){
  var list = getArchives();
  var pending = list.filter(function(r){ return r.status === 'pending'; }).length;
  var validated = list.filter(function(r){ return r.status === 'validated' || !r.status; }).length;
  var c = document.getElementById('archives-count');
  if (c) c.textContent = validated;
  var p = document.getElementById('archives-pending-count');
  if (p){
    if (pending > 0){ p.textContent = '⏳ ' + pending; p.style.display = 'inline-block'; }
    else { p.style.display = 'none'; }
  }
}

function validateContract(type){
  var panel = document.getElementById('panel-' + type);
  if (!panel) return;
  var doc = panel.querySelector('.contract-doc');
  var inputs = Array.from(doc.querySelectorAll('input, textarea'));
  var canvases = Array.from(doc.querySelectorAll('canvas.sig-canvas'));

  // Identifier les inputs de la zone Organisateur (à exclure de la validation côté partenaire)
  var orgSigCol = doc.querySelector('.signature-block .signature-col:first-child');
  var orgInputsSet = orgSigCol ? new Set(orgSigCol.querySelectorAll('input, textarea')) : new Set();

  // Reset du highlight précédent
  inputs.forEach(function(el){ el.classList.remove('field-missing'); });

  // Vérifier les champs requis
  var missing = [];
  inputs.forEach(function(el){
    if (el.type === 'checkbox') return;
    if (el.dataset.optional === '1') return;
    if (orgInputsSet.has(el)) return; // zone organisateur : non requise côté partenaire
    var v = (el.value || '').trim();
    if (!v){
      el.classList.add('field-missing');
      missing.push(el);
    }
  });

  if (missing.length){
    if (missing[0]) missing[0].scrollIntoView({behavior:'smooth', block:'center'});
    mcAlert('⚠ Veuillez remplir tous les champs obligatoires (en rouge) avant de soumettre.\n\n' + missing.length + ' champ(s) manquant(s).', { title: 'Champs manquants' });
    return;
  }

  // Convention : index 0 = Organisateur, index 1 = Partenaire
  if (canvases.length < 2 || isCanvasBlank(canvases[1])){
    mcAlert('⚠ Veuillez signer la zone « Pour le Partenaire » avant de soumettre le contrat.', { title: 'Signature manquante' });
    return;
  }

  // Détecter le nom du partenaire
  var partnerName = '';
  inputs.forEach(function(el){
    if (partnerName) return;
    var lbl = el.previousElementSibling && el.previousElementSibling.textContent || '';
    if (el.type === 'text' && el.value && /raison|nom|établissement/i.test(lbl)){
      partnerName = el.value;
    }
  });
  if (!partnerName){
    var firstText = inputs.find(function(el){ return el.type === 'text' && el.value; });
    if (firstText) partnerName = firstText.value;
  }
  if (!partnerName) partnerName = '— Partenaire non nommé —';

  var fields = inputs.map(function(el){
    if (el.type === 'checkbox') return el.checked ? 1 : 0;
    return el.value || '';
  });
  // On enregistre uniquement la signature partenaire ; l'organisateur signera plus tard
  var signatures = canvases.map(function(c, i){
    if (i === 0) return ''; // Organisateur : à signer après par l'organisateur
    return isCanvasBlank(c) ? '' : c.toDataURL('image/png');
  });

  var creator = getCurrentUser();
  // Snapshot du template au moment de la soumission (le contrat ne sera pas affecté par les modifs futures du template)
  var tplSnap = null;
  try {
    var tpl = getTemplate(type);
    if (tpl) tplSnap = JSON.parse(JSON.stringify(tpl));
  } catch(e){}
  var record = {
    id: 'C' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    type: type,
    partnerName: partnerName,
    createdBy: creator ? creator.username : null,
    createdByDisplay: creator ? (creator.displayName || creator.username) : null,
    creatorAvatar: creator ? (creator.avatar || defaultAvatar(creator.displayName || creator.username)) : null,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    validatedAt: null,
    fields: fields,
    signatures: signatures,
    templateSnapshot: tplSnap   // copie figée du template à la signature
  };
  var list = getArchives();
  list.unshift(record);
  saveArchives(list);
  logAction('Contrat soumis (en attente)', (CONTRACT_LABELS[type] || {label: type}).label + ' — ' + partnerName);

  // Réinitialiser le formulaire pour ne pas garder l'ancienne signature
  canvases.forEach(function(c){ c.getContext('2d').clearRect(0, 0, c.width, c.height); });

  mcAlert('✓ Contrat soumis !\n\nIl est désormais EN ATTENTE de validation par l\'organisateur.\n\nRetrouvez-le dans l\'onglet « 📁 Contrats ».', { title: 'Soumission réussie' });
  var archTab = document.querySelector('.contract-tab[data-tab="archives"]');
  if (archTab) archTab.click();
}

// ===== ORGANISATEUR : SIGNATURE & VALIDATION FINALE =====
function organizerSignAndValidate(id){
  var content = document.getElementById('view-modal-content');
  var docClone = content.querySelector('.contract-doc');
  if (!docClone){ alert('Erreur : contrat introuvable.'); return; }

  // Vérifier les champs Organisateur (non readonly) : ils doivent être remplis
  var orgSigCol = docClone.querySelector('.signature-block .signature-col:first-child');
  var orgInputs = orgSigCol ? Array.from(orgSigCol.querySelectorAll('input, textarea')) : [];
  orgInputs.forEach(function(el){ el.classList.remove('field-missing'); });
  var missing = [];
  orgInputs.forEach(function(el){
    if (el.type === 'checkbox') return;
    var v = (el.value || '').trim();
    if (!v){
      el.classList.add('field-missing');
      missing.push(el);
    }
  });
  if (missing.length){
    if (missing[0]) missing[0].scrollIntoView({behavior:'smooth', block:'center'});
    mcAlert('⚠ Veuillez remplir vos champs Organisateur (en rouge) avant de confirmer.\n\n' + missing.length + ' champ(s) manquant(s).', { title: 'Champs manquants' });
    return;
  }

  // Vérifier la signature organisateur
  var orgCanvas = docClone.querySelector('canvas.sig-canvas[data-role="org"]');
  if (!orgCanvas){ mcAlert('Erreur : zone de signature organisateur introuvable.'); return; }
  if (isCanvasBlank(orgCanvas)){
    mcAlert('⚠ Veuillez signer en tant qu\'organisateur avant de confirmer.', { title: 'Signature manquante' });
    return;
  }

  // Récupérer toutes les valeurs (incluant celles modifiées par l'organisateur)
  var allInputs = Array.from(docClone.querySelectorAll('input, textarea'));
  var newFields = allInputs.map(function(el){
    if (el.type === 'checkbox') return el.checked ? 1 : 0;
    return el.value || '';
  });

  var list = getArchives();
  var idx = list.findIndex(function(r){ return r.id === id; });
  if (idx === -1) return;
  list[idx].fields = newFields;
  list[idx].signatures[0] = orgCanvas.toDataURL('image/png');
  list[idx].status = 'validated';
  list[idx].validatedAt = new Date().toISOString();
  saveArchives(list);
  logAction('Contrat validé', (CONTRACT_LABELS[list[idx].type] || {label: list[idx].type}).label + ' — ' + list[idx].partnerName);
  closeViewModal();
  renderArchivesList();
  mcAlert('✓ Contrat validé et archivé définitivement.\n\nIl est maintenant non-éditable et imprimable.', { title: 'Validation réussie' });
}

function escHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
  });
}
function fmtDate(iso){
  var d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })
       + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}
function renderArchivesList(){
  var c = document.getElementById('validated-container');
  if (!c) return;
  updateArchivesCount();
  var allList = getArchives();
  // Filtrer selon les droits : admin et perm 'all_contracts' voient tout, les autres ne voient que les leurs
  var user = getCurrentUser();
  var canSeeAll = user && (user.isAdmin || (user.perms || []).indexOf('all_contracts') !== -1);
  var list;
  if (canSeeAll){
    list = allList;
  } else if (user){
    var dn = (user.displayName || '').toLowerCase();
    var un = user.username.toLowerCase();
    list = allList.filter(function(r){
      // Méthode 1 (récente) : matching par createdBy (fiable, indépendant du contenu du contrat)
      if (r.createdBy) return r.createdBy === user.username;
      // Méthode 2 (legacy) : matching par partnerName pour les anciens contrats sans createdBy
      var pn = (r.partnerName || '').toLowerCase();
      return (dn && pn.indexOf(dn) !== -1) || pn.indexOf(un) !== -1;
    });
  } else {
    list = []; // pas connecté : aucun contrat visible
  }
  // Afficher la barre de filtres si on a au moins quelques contrats à filtrer (et connecté)
  var filtersBar = document.getElementById('archives-filters');
  if (filtersBar) filtersBar.style.display = (user && list.length > 2) ? 'flex' : 'none';
  // Appliquer les filtres en cours
  list = applyArchFilters(list);
  if (list.length === 0){
    c.innerHTML = '<div class="validated-empty">' + (canSeeAll
      ? 'Aucun contrat ne correspond à vos critères de recherche.'
      : (user ? 'Vous n\'avez aucun contrat à votre nom pour le moment.' : 'Connectez-vous pour voir vos contrats.')
    ) + '</div>';
    return;
  }
  var pending = list.filter(function(r){ return r.status === 'pending'; });
  var validated = list.filter(function(r){ return r.status === 'validated' || !r.status; });

  function rowPending(r){
    var meta = (r.templateSnapshot && r.templateSnapshot.label)
      ? { label: r.templateSnapshot.label, icon: r.templateSnapshot.icon, ref: r.templateSnapshot.ref }
      : (typeof getContractMeta === 'function' ? getContractMeta(r.type) : (CONTRACT_LABELS[r.type] || { label: r.type, icon: '📄', ref: '' }));
    return '<div class="validated-item pending-item" data-id="' + escHtml(r.id) + '">'
      + '<div class="vi-icon">' + meta.icon + '</div>'
      + '<div class="vi-info">'
        + '<div class="vi-title">' + escHtml(meta.label) + ' <span class="status-badge status-pending">⏳ EN ATTENTE</span></div>'
        + '<div class="vi-partner">' + escHtml(r.partnerName) + '</div>'
        + '<div class="vi-date">Soumis par le partenaire le ' + fmtDate(r.submittedAt || r.validatedAt) + '</div>'
      + '</div>'
      + '<div class="vi-actions">'
        + '<button class="vi-btn vi-btn-sign" onclick="viewArchive(\'' + r.id + '\')">✍ Voir et signer</button>'
        + '<button class="vi-btn vi-btn-del" onclick="deleteArchive(\'' + r.id + '\')">🗑 Refuser</button>'
      + '</div>'
    + '</div>';
  }
  function rowValidated(r){
    var meta = (r.templateSnapshot && r.templateSnapshot.label)
      ? { label: r.templateSnapshot.label, icon: r.templateSnapshot.icon, ref: r.templateSnapshot.ref }
      : (typeof getContractMeta === 'function' ? getContractMeta(r.type) : (CONTRACT_LABELS[r.type] || { label: r.type, icon: '📄', ref: '' }));
    var ownerLabel = r.createdByDisplay
      ? '<span style="color:#6a7a8a;font-size:11px;font-weight:400"> — par ' + escHtml(r.createdByDisplay) + '</span>'
      : (r.createdBy ? '<span style="color:#6a7a8a;font-size:11px;font-weight:400"> — par @' + escHtml(r.createdBy) + '</span>' : '<span style="color:#ff4757;font-size:11px;font-weight:600;font-style:italic"> — ⚠ orphelin</span>');
    var reassignBtn = userIsAdmin()
      ? '<button class="vi-btn vi-btn-view" onclick="reassignArchive(\'' + r.id + '\')" title="Réassigner à un utilisateur">🔗</button>'
      : '';
    return '<div class="validated-item" data-id="' + escHtml(r.id) + '">'
      + '<div class="vi-icon">' + meta.icon + '</div>'
      + '<div class="vi-info">'
        + '<div class="vi-title">' + escHtml(meta.label) + ' <span class="status-badge status-validated">✓ VALIDÉ</span></div>'
        + '<div class="vi-partner">' + escHtml(r.partnerName) + ownerLabel + '</div>'
        + '<div class="vi-date">Validé le ' + fmtDate(r.validatedAt) + '</div>'
      + '</div>'
      + '<div class="vi-actions">'
        + '<button class="vi-btn vi-btn-view" onclick="viewArchive(\'' + r.id + '\')">👁 Voir</button>'
        + '<button class="vi-btn vi-btn-view" onclick="presentArchive(\'' + r.id + '\')">🖥 Présenter</button>'
        + '<button class="vi-btn vi-btn-print" onclick="printArchive(\'' + r.id + '\')">🖨 Imprimer</button>'
        + '<button class="vi-btn vi-btn-print" onclick="downloadContractPng(\'' + r.id + '\')">⬇ PNG</button>'
        + '<button class="vi-btn vi-btn-print" onclick="downloadContractPdf(\'' + r.id + '\')">📄 PDF</button>'
        + '<button class="vi-btn vi-btn-view" onclick="showQRCode(\'' + r.id + '\')">📱 QR</button>'
        + reassignBtn
        + '<button class="vi-btn vi-btn-del" onclick="deleteArchive(\'' + r.id + '\')">🗑 Supprimer</button>'
      + '</div>'
    + '</div>';
  }

  var html = '';
  if (pending.length){
    html += '<div class="archives-section-title pending">⏳ En attente de votre validation (' + pending.length + ')</div>';
    html += '<div class="validated-list">' + pending.map(rowPending).join('') + '</div>';
  }
  if (validated.length){
    html += '<div class="archives-section-title validated">✓ Contrats validés &amp; archivés (' + validated.length + ')</div>';
    html += '<div class="validated-list">' + validated.map(rowValidated).join('') + '</div>';
  }
  c.innerHTML = html;
}

function buildArchiveDoc(record, opts){
  opts = opts || {};
  var editableOrg = !!opts.editableOrgSignature;
  var clone;
  // Priorité 1 : snapshot historique du template (contrats récents) → garantit l'aspect d'origine
  if (record.templateSnapshot && typeof buildContractHTML === 'function'){
    clone = document.createElement('div');
    clone.className = 'contract-doc';
    clone.innerHTML = buildContractHTML(record.templateSnapshot);
  } else {
    // Priorité 2 : panel actuel (fallback pour contrats anciens sans snapshot)
    var srcPanel = document.getElementById('panel-' + record.type);
    if (!srcPanel) return null;
    var srcDoc = srcPanel.querySelector('.contract-doc');
    if (!srcDoc) return null;
    clone = srcDoc.cloneNode(true);
  }
  // Injecter le logo de l'entreprise du partenaire dans l'en-tête (si avatar disponible)
  var avatar = record.creatorAvatar;
  if (avatar){
    var header = clone.querySelector('.contract-header');
    var meta = clone.querySelector('.contract-meta');
    if (header && meta && !clone.querySelector('.contract-partner-logo')){
      var partnerLogo = document.createElement('div');
      partnerLogo.className = 'contract-partner-logo';
      partnerLogo.innerHTML = '<img src="' + avatar + '" alt="Logo partenaire">'
                            + '<div class="cpl-label">Partenaire</div>'
                            + '<div class="cpl-name">' + escHtml(record.createdByDisplay || record.partnerName || '') + '</div>';
      header.insertBefore(partnerLogo, meta);
    }
  }
  // Identifier les inputs de la zone Organisateur (1ère signature-col)
  var firstSigCol = clone.querySelector('.signature-block .signature-col:first-child');
  var orgInputs = firstSigCol ? Array.from(firstSigCol.querySelectorAll('input, textarea')) : [];
  var orgInputsSet = new Set(orgInputs);
  // En mode édition org, retirer le message de verrouillage du clone
  if (editableOrg){
    Array.from(clone.querySelectorAll('.org-locked-msg')).forEach(function(m){ m.remove(); });
  }
  var inputs = Array.from(clone.querySelectorAll('input, textarea'));
  inputs.forEach(function(el, i){
    var v = record.fields[i];
    if (el.type === 'checkbox'){ el.checked = !!v; }
    else { el.value = v == null ? '' : v; }
    var keepEditable = editableOrg && orgInputsSet.has(el);
    if (keepEditable){
      el.removeAttribute('readonly');
      el.removeAttribute('disabled');
      el.disabled = false;
      el.readOnly = false;
      el.classList.remove('org-locked-input');
      el.classList.add('org-editable');
    } else {
      el.setAttribute('readonly', 'readonly');
      el.setAttribute('disabled', 'disabled');
    }
  });
  var canvases = Array.from(clone.querySelectorAll('canvas.sig-canvas'));
  canvases.forEach(function(c, i){
    var isOrgSlot = (i === 0);
    var dataURL = record.signatures[i];
    // Cas 1 : signature présente -> img
    if (dataURL){
      var img = document.createElement('img');
      img.src = dataURL;
      img.className = 'sig-img';
      c.replaceWith(img);
      return;
    }
    // Cas 2 : organisateur en mode édition -> garder canvas dessinable
    if (editableOrg && isOrgSlot){
      c.dataset.role = 'org';
      return;
    }
    // Cas 3 : autre -> placeholder
    var ph = document.createElement('div');
    ph.className = 'sig-img-placeholder';
    ph.textContent = isOrgSlot ? '(en attente — organisateur)' : '(non signé)';
    c.replaceWith(ph);
  });
  // Boutons effacer : garder seulement celui de l'org en mode pending
  var clearBtns = Array.from(clone.querySelectorAll('.sig-clear'));
  clearBtns.forEach(function(b, i){
    if (editableOrg && i === 0) return; // garder
    b.remove();
  });
  return clone;
}

function viewArchive(id){
  var rec = getArchives().find(function(r){ return r.id === id; });
  if (!rec) return;
  var isPending = rec.status === 'pending';
  // Pour les contrats en attente, demander le code organisateur AVANT d'ouvrir
  if (isPending){
    requireOrgCode('Code requis pour valider ce contrat en attente.').then(function(ok){
      if (ok) _openArchiveView(rec, true);
    });
    return;
  }
  _openArchiveView(rec, false);
}
function _openArchiveView(rec, isPending){
  if (!rec) return;
  // Préférer le snapshot historique pour le label (cohérence avec le contenu affiché)
  var meta = (rec.templateSnapshot && rec.templateSnapshot.label)
    ? { label: rec.templateSnapshot.label, icon: rec.templateSnapshot.icon, ref: rec.templateSnapshot.ref }
    : (typeof getContractMeta === 'function' ? getContractMeta(rec.type) : (CONTRACT_LABELS[rec.type] || { label: rec.type }));
  var titleSuffix = isPending ? '  ⏳ En attente de validation' : '  ✓ Validé';
  document.getElementById('view-modal-title').textContent = meta.label + ' — ' + rec.partnerName + titleSuffix;
  var clone = buildArchiveDoc(rec, { editableOrgSignature: isPending });
  var content = document.getElementById('view-modal-content');
  content.innerHTML = '';
  content.dataset.mode = isPending ? 'pending' : 'validated';
  if (clone) content.appendChild(clone);
  // Init signature canvas si éditable
  if (isPending){
    var orgCanvas = content.querySelector('canvas.sig-canvas[data-role="org"]');
    if (orgCanvas){
      orgCanvas.removeAttribute('disabled');
      orgCanvas.removeAttribute('readonly');
      orgCanvas.classList.remove('org-locked-canvas');
      delete orgCanvas.dataset.sigInit;
      initSigCanvas(orgCanvas);
    }
  }
  // Configurer les boutons d'action
  var actions = document.getElementById('view-modal-actions');
  if (isPending){
    actions.innerHTML =
        '<button class="vi-btn vi-btn-confirm" onclick="organizerSignAndValidate(\'' + rec.id + '\')">✓ Confirmer la validation</button>'
      + '<button class="vi-btn vi-btn-view" onclick="closeViewModal()">✕ Fermer</button>';
  } else {
    actions.innerHTML =
        '<button class="vi-btn vi-btn-view" onclick="closeViewModal();presentArchive(\'' + rec.id + '\')">🖥 Présenter</button>'
      + '<button class="vi-btn vi-btn-print" onclick="printValidated()">🖨 Imprimer</button>'
      + '<button class="vi-btn vi-btn-print" onclick="downloadContractPng(\'' + rec.id + '\')">⬇ PNG</button>'
      + '<button class="vi-btn vi-btn-print" onclick="downloadContractPdf(\'' + rec.id + '\')">📄 PDF</button>'
      + '<button class="vi-btn vi-btn-view" onclick="showQRCode(\'' + rec.id + '\')">📱 QR</button>'
      + '<button class="vi-btn vi-btn-view" onclick="closeViewModal()">✕ Fermer</button>';
  }
  document.getElementById('view-modal').classList.add('active');
}

function closeViewModal(){
  document.getElementById('view-modal').classList.remove('active');
  document.getElementById('view-modal-content').innerHTML = '';
}
function printValidated(){
  requireOrgCode().then(function(ok){ if (!ok) return; _printValidatedConfirmed(); });
}
function _printValidatedConfirmed(){
  var content = document.getElementById('view-modal-content');
  var clone = content.firstElementChild;
  if (!clone) return;
  var area = document.getElementById('print-area');
  area.innerHTML = '';
  area.appendChild(clone.cloneNode(true));
  document.body.classList.add('print-validated');
  setTimeout(function(){
    window.print();
    setTimeout(function(){
      document.body.classList.remove('print-validated');
      area.innerHTML = '';
    }, 200);
  }, 80);
}
function printArchive(id){
  requireOrgCode().then(function(ok){ if (!ok) return; _printArchiveConfirmed(id); });
}
function _printArchiveConfirmed(id){
  var rec = getArchives().find(function(r){ return r.id === id; });
  if (!rec) return;
  var clone = buildArchiveDoc(rec);
  var area = document.getElementById('print-area');
  area.innerHTML = '';
  if (clone) area.appendChild(clone);
  document.body.classList.add('print-validated');
  setTimeout(function(){
    window.print();
    setTimeout(function(){
      document.body.classList.remove('print-validated');
      area.innerHTML = '';
    }, 200);
  }, 80);
}
// ===========================================================
// MODE PRÉSENTATION PLEIN ÉCRAN
// ===========================================================
function presentArchive(id){
  var rec = getArchives().find(function(r){ return r.id === id; });
  if (!rec) return;
  var meta = (typeof CONTRACT_LABELS !== 'undefined' && CONTRACT_LABELS[rec.type]) || { label: rec.type, icon: '📄' };
  var ov = document.getElementById('present-overlay');
  if (!ov) return;
  document.getElementById('present-icon').textContent = meta.icon;
  document.getElementById('present-title').textContent = meta.label + ' — ' + (rec.partnerName || '');
  document.getElementById('present-subtitle').textContent = 'Validé le ' + (typeof fmtDate === 'function' ? fmtDate(rec.validatedAt) : rec.validatedAt);
  var doc = buildArchiveDoc(rec);
  var content = document.getElementById('present-content');
  content.innerHTML = '';
  if (doc) content.appendChild(doc);
  ov.classList.add('active');
  document.body.classList.add('present-active');
}
function closePresent(){
  var ov = document.getElementById('present-overlay');
  if (ov) ov.classList.remove('active');
  document.body.classList.remove('present-active');
  var content = document.getElementById('present-content');
  if (content) content.innerHTML = '';
}
// Touche Échap pour fermer la présentation
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape'){
    var ov = document.getElementById('present-overlay');
    if (ov && ov.classList.contains('active')) closePresent();
  }
});

// ===========================================================
// EXPORT PDF (jsPDF + html2canvas)
// ===========================================================
function downloadContractPdf(id){
  requireOrgCode().then(function(ok){ if (!ok) return; _downloadContractPdfConfirmed(id); });
}
function _downloadContractPdfConfirmed(id){
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined'){
    mcAlert('⚠ Modules d\'export PDF non chargés.\nVérifiez votre connexion internet.', { title: 'Erreur' });
    return;
  }
  var rec = getArchives().find(function(r){ return r.id === id; });
  if (!rec) return;
  var doc = buildArchiveDoc(rec);
  if (!doc) return;
  var clone = freezeContractClone(doc);
  clone.classList.add('contract-png-export');
  Array.from(clone.querySelectorAll('.org-locked-msg')).forEach(function(el){ el.remove(); });
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1050px;background:#fdfaf4';
  container.appendChild(clone);
  document.body.appendChild(container);
  setTimeout(function(){
    html2canvas(container, { backgroundColor: '#fdfaf4', scale: 2, useCORS: true, logging: false }).then(function(canvas){
      var jsPDF = window.jspdf.jsPDF;
      // A4 portrait : 210 x 297 mm — on force 1 seule page (scale-down si nécessaire)
      var pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      var pageW = 210, pageH = 297, margin = 6;
      var availW = pageW - margin * 2;
      var availH = pageH - margin * 2;
      var imgRatio = canvas.height / canvas.width;
      var imgData = canvas.toDataURL('image/jpeg', 0.92);
      var w, h, x, y;
      // On calcule la taille qui tient à la fois en largeur ET en hauteur (fit to page)
      if (availW * imgRatio <= availH){
        // Limité par la largeur
        w = availW;
        h = availW * imgRatio;
      } else {
        // Limité par la hauteur (cas du contrat long)
        h = availH;
        w = availH / imgRatio;
      }
      x = (pageW - w) / 2; // centré horizontalement
      y = margin;          // collé en haut
      pdf.addImage(imgData, 'JPEG', x, y, w, h);
      var slug = (rec.partnerName || 'contrat').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30);
      pdf.save('master-clash-' + rec.type + '-' + (slug || 'contrat') + '.pdf');
      document.body.removeChild(container);
    }).catch(function(err){
      mcAlert('Erreur génération PDF : ' + err, { title: 'Erreur' });
      try { document.body.removeChild(container); } catch(_){}
    });
  }, 80);
}

// ===========================================================
// QR CODE — pointe vers l'URL du contrat
// ===========================================================
var _qrLastDataUrl = null;
var _qrLastFilename = 'qr-code.png';
function showQRCode(id){
  if (typeof qrcode === 'undefined'){
    mcAlert('⚠ Module QR Code non chargé.\nVérifiez votre connexion internet.', { title: 'Erreur' });
    return;
  }
  var rec = getArchives().find(function(r){ return r.id === id; });
  if (!rec) return;
  // URL du contrat (basée sur l'origin actuel)
  var base = location.origin + location.pathname.replace(/[^/]*$/, '');
  var url = base + 'contrats.html?view=' + rec.id;
  var meta = (typeof CONTRACT_LABELS !== 'undefined' && CONTRACT_LABELS[rec.type]) || { label: rec.type };
  document.getElementById('qr-modal-title').textContent = meta.label + ' — ' + (rec.partnerName || '');
  document.getElementById('qr-modal-url').textContent = url;
  // Génération du QR (level H = haute correction d'erreur)
  var qr = qrcode(0, 'H');
  qr.addData(url);
  qr.make();
  // Création canvas
  var size = 280;
  var modules = qr.getModuleCount();
  var cellSize = Math.floor(size / modules);
  var realSize = cellSize * modules;
  var canvas = document.createElement('canvas');
  canvas.width = realSize;
  canvas.height = realSize;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, realSize, realSize);
  ctx.fillStyle = '#0a0e1a';
  for (var r = 0; r < modules; r++){
    for (var c = 0; c < modules; c++){
      if (qr.isDark(r, c)) ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }
  // Ajouter le canvas dans la modale
  var container = document.getElementById('qr-modal-canvas');
  container.innerHTML = '';
  container.appendChild(canvas);
  _qrLastDataUrl = canvas.toDataURL('image/png');
  var slug = (rec.partnerName || 'contrat').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30);
  _qrLastFilename = 'qr-master-clash-' + rec.type + '-' + (slug || 'contrat') + '.png';
  document.getElementById('qr-modal').classList.add('active');
}
function closeQrModal(){
  document.getElementById('qr-modal').classList.remove('active');
}
function downloadQrPng(){
  if (!_qrLastDataUrl) return;
  var a = document.createElement('a');
  a.href = _qrLastDataUrl;
  a.download = _qrLastFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function deleteArchive(id){
  requireOrgCode('Code requis pour supprimer ce contrat.').then(function(ok){
    if (!ok) return;
    return mcConfirm('Supprimer définitivement ce contrat ?\n\nCette action est irréversible.', { okText: '🗑 Supprimer' });
  }).then(function(ok){
    if (!ok) return;
    var list = getArchives().filter(function(r){ return r.id !== id; });
    saveArchives(list);
    renderArchivesList();
    return mcAlert('✓ Contrat supprimé.', { title: 'Suppression réussie' });
  });
}

function printActive(){ window.print(); }

// Vérifie que l'utilisateur connecté a la permission requise pour cette action.
// Plus de demande de code : on bloque directement si pas de permission.
function requireOrgCode(titleMsg, requiredPerm){
  var perm = requiredPerm || 'validate';
  if (userIsAdmin() || userHasPerm(perm)) return Promise.resolve(true);
  var user = getCurrentUser();
  var msg = user
    ? 'Votre compte « ' + (user.displayName || user.username) + ' » n\'a pas la permission nécessaire pour cette action.\n\nContactez l\'organisateur (BoulaTV) pour demander un accès.'
    : 'Cette action est réservée aux utilisateurs autorisés.\n\nConnectez-vous avec un compte ayant les droits requis.';
  return mcAlert(msg, { title: '🚫 Permission insuffisante' }).then(function(){
    if (!user) openLoginModal();
    return false;
  });
}

// ===== EXPORT PNG (html2canvas) =====
function ensureH2C(){
  if (typeof html2canvas === 'undefined'){
    mcAlert('⚠ Module d\'export PNG non chargé.\nVérifiez votre connexion internet.', { title: 'Erreur' });
    return false;
  }
  return true;
}
function snapToPng(element, filename){
  if (!ensureH2C()) return;
  // Wait microtask for any layout
  html2canvas(element, {
    backgroundColor: '#fdfaf4',
    scale: 2,
    useCORS: true,
    logging: false
  }).then(function(canvas){
    var link = document.createElement('a');
    link.download = filename || ('master-clash-' + Date.now() + '.png');
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }).catch(function(err){
    mcAlert('Erreur lors de la génération du PNG : ' + err, { title: 'Erreur' });
  });
}

// ===== BONS : impression / PNG individuels =====
function printCoupon(btn){
  var coupon = btn.closest('.coupon');
  if (!coupon) return;
  var area = document.getElementById('print-area');
  area.innerHTML = '';
  var clone = coupon.cloneNode(true);
  // Retirer les boutons d'action
  Array.from(clone.querySelectorAll('.coupon-actions')).forEach(function(b){ b.remove(); });
  // Wrapper dans un container avec padding
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:30px;max-width:500px;margin:0 auto';
  wrap.appendChild(clone);
  area.appendChild(wrap);
  document.body.classList.add('print-validated');
  setTimeout(function(){
    window.print();
    setTimeout(function(){
      document.body.classList.remove('print-validated');
      area.innerHTML = '';
    }, 200);
  }, 80);
}
function downloadCouponPng(btn){
  var coupon = btn.closest('.coupon');
  if (!coupon) return;
  // Utiliser la même transformation input → texte que pour les contrats
  var clone = freezeContractClone(coupon);
  clone.classList.add('coupon-png-export');
  Array.from(clone.querySelectorAll('.coupon-actions')).forEach(function(b){ b.remove(); });
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:420px;background:#fdfaf4;padding:24px';
  container.appendChild(clone);
  document.body.appendChild(container);
  var title = (clone.querySelector('.coupon-title') || {}).textContent || 'bon';
  var slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  setTimeout(function(){
    snapToPng(container, 'master-clash-' + slug + '.png');
    setTimeout(function(){ document.body.removeChild(container); }, 1500);
  }, 60);
}

// ===== CONTRATS : téléchargement PNG =====
function downloadActiveContractPng(btn){
  var panel = btn.closest('.contract-panel');
  if (!panel) return;
  var doc = panel.querySelector('.contract-doc');
  if (!doc) return;
  var clone = freezeContractClone(doc);
  clone.classList.add('contract-png-export');
  // Retirer le message "zone réservée organisateur" du PNG
  Array.from(clone.querySelectorAll('.org-locked-msg')).forEach(function(el){ el.remove(); });
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1050px;background:#fdfaf4';
  container.appendChild(clone);
  document.body.appendChild(container);
  var type = panel.id.replace('panel-', '');
  setTimeout(function(){
    snapToPng(container, 'master-clash-contrat-' + type + '.png');
    setTimeout(function(){ document.body.removeChild(container); }, 1500);
  }, 60);
}
function downloadContractPng(id){
  requireOrgCode().then(function(ok){ if (!ok) return; _downloadContractPngConfirmed(id); });
}
function _downloadContractPngConfirmed(id){
  var rec = getArchives().find(function(r){ return r.id === id; });
  if (!rec) return;
  var doc = buildArchiveDoc(rec);
  if (!doc) return;
  var clone = freezeContractClone(doc);
  clone.classList.add('contract-png-export');
  Array.from(clone.querySelectorAll('.org-locked-msg')).forEach(function(el){ el.remove(); });
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1050px;background:#fdfaf4';
  container.appendChild(clone);
  document.body.appendChild(container);
  var slug = rec.partnerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30);
  setTimeout(function(){
    snapToPng(container, 'master-clash-' + rec.type + '-' + (slug || 'contrat') + '.png');
    setTimeout(function(){ document.body.removeChild(container); }, 1500);
  }, 60);
}
// Convertit les <input> et <textarea> en éléments texte pour un rendu PNG net & lisible
function freezeContractClone(doc){
  var clone = doc.cloneNode(true);
  var srcInputs = Array.from(doc.querySelectorAll('input, textarea'));
  var dstInputs = Array.from(clone.querySelectorAll('input, textarea'));
  srcInputs.forEach(function(s, i){
    var d = dstInputs[i];
    if (!d) return;
    var newEl;
    if (s.type === 'checkbox'){
      newEl = document.createElement('span');
      newEl.className = 'frozen-checkbox';
      newEl.textContent = s.checked ? '☑' : '☐';
    } else if (s.tagName === 'TEXTAREA'){
      newEl = document.createElement('div');
      newEl.className = 'frozen-textarea';
      newEl.textContent = s.value || '';
    } else {
      newEl = document.createElement('span');
      newEl.className = 'frozen-input';
      var v = s.value || '';
      // Format date FR
      if (s.type === 'date' && v){
        var parts = v.split('-');
        if (parts.length === 3) v = parts[2] + '/' + parts[1] + '/' + parts[0];
      }
      newEl.textContent = v;
      // Préserver le style inline (notamment width)
      var style = s.getAttribute('style');
      if (style) newEl.setAttribute('style', style);
    }
    d.replaceWith(newEl);
  });
  Array.from(clone.querySelectorAll('.sig-clear')).forEach(function(b){ b.remove(); });
  return clone;
}

updateArchivesCount();

// ===== ADMIN =====
var _showCode = false;
function toggleShowCode(){
  _showCode = !_showCode;
  var el = document.getElementById('admin-current-code');
  if (el) el.textContent = _showCode ? MC_SECRET : '••••••••';
  var btn = el && el.nextElementSibling;
  if (btn) btn.textContent = _showCode ? '🙈 Masquer' : '👁 Afficher';
}
function changeSecret(){
  mcPrompt('Étape 1/3 — Saisissez le code actuel :', { title: '🔑 Changer le code', inputType: 'password', placeholder: 'Code actuel' })
    .then(function(oldCode){
      if (oldCode === null) return null;
      if ((oldCode || '').trim().toUpperCase() !== MC_SECRET){
        return mcAlert('⚠ Code actuel incorrect.', { title: 'Erreur' }).then(function(){ return null; });
      }
      return mcPrompt('Étape 2/3 — Saisissez le NOUVEAU code\n(4 caractères minimum, lettres/chiffres uniquement) :', {
        title: '🔑 Nouveau code',
        inputType: 'text',
        placeholder: 'NOUVEAU-CODE',
        validate: function(v){
          v = (v || '').trim().toUpperCase();
          if (v.length < 4) return 'Minimum 4 caractères.';
          if (!/^[A-Z0-9]+$/.test(v)) return 'Lettres et chiffres uniquement.';
          return null;
        }
      });
    })
    .then(function(newCode){
      if (newCode === null || newCode === undefined) return null;
      newCode = (newCode || '').trim().toUpperCase();
      return mcPrompt('Étape 3/3 — Confirmez le nouveau code :', {
        title: '🔑 Confirmation',
        inputType: 'password',
        placeholder: 'Re-saisissez le code'
      }).then(function(confirmCode){
        if (confirmCode === null) return null;
        if ((confirmCode || '').trim().toUpperCase() !== newCode){
          return mcAlert('⚠ Les codes ne correspondent pas.\nModification annulée.', { title: 'Erreur' }).then(function(){ return null; });
        }
        return newCode;
      });
    })
    .then(function(newCode){
      if (!newCode) return;
      MC_SECRET = newCode;
      try { localStorage.setItem(MC_SECRET_KEY, newCode); } catch(e){}
      if (_showCode){
        var el = document.getElementById('admin-current-code');
        if (el) el.textContent = MC_SECRET;
      }
      mcAlert('✓ Code modifié avec succès.\n\nNouveau code : ' + newCode, { title: 'Succès' });
    });
}
function resetSecret(){
  mcConfirm('Restaurer le code par défaut (' + MC_DEFAULT_SECRET + ') ?', { title: '↺ Réinitialiser', okText: 'Restaurer' })
    .then(function(ok){
      if (!ok) return false;
      return requireOrgCode('Saisissez le code actuel pour confirmer.');
    })
    .then(function(ok){
      if (!ok) return;
      MC_SECRET = MC_DEFAULT_SECRET;
      try { localStorage.removeItem(MC_SECRET_KEY); } catch(e){}
      if (_showCode){
        var el = document.getElementById('admin-current-code');
        if (el) el.textContent = MC_SECRET;
      }
      mcAlert('✓ Code restauré au défaut : ' + MC_DEFAULT_SECRET, { title: 'Succès' });
    });
}
function lockAllSections(){
  mcConfirm('Re-verrouiller toutes les sections ?\n\nLe code devra être ressaisi pour accéder aux sections protégées.', { title: '🔒 Re-verrouillage', okText: 'Re-verrouiller' })
    .then(function(ok){
      if (!ok) return;
      try { localStorage.removeItem(MC_UNLOCK_KEY); } catch(e){}
      return mcAlert('✓ Sections re-verrouillées.\nLa page va se recharger.', { title: 'Succès' });
    })
    .then(function(){ if (arguments[0] !== undefined) setTimeout(function(){ location.reload(); }, 200); });
}
// Réassigner manuellement un contrat à un user (utile pour les anciens contrats sans createdBy)
function reassignArchive(id){
  if (!userIsAdmin()) return;
  var users = getUsers();
  var options = users.map(function(u){ return u.username + ' (' + (u.displayName || u.username) + ')'; }).join('\n');
  mcPrompt('Saisissez le LOGIN du propriétaire de ce contrat.\n\nUtilisateurs disponibles :\n' + options, {
    title: '🔗 Réassigner le contrat',
    placeholder: 'login',
    okText: 'Réassigner'
  }).then(function(login){
    if (!login) return;
    login = login.trim();
    var u = users.find(function(x){ return x.username.toLowerCase() === login.toLowerCase(); });
    if (!u){ mcAlert('⚠ Utilisateur introuvable : ' + login, { title: 'Erreur' }); return; }
    var list = getArchives();
    var idx = list.findIndex(function(r){ return r.id === id; });
    if (idx === -1) return;
    list[idx].createdBy = u.username;
    list[idx].createdByDisplay = u.displayName || u.username;
    saveArchives(list);
    renderArchivesList();
    mcAlert('✓ Contrat réassigné à ' + u.username + '.', { title: 'Succès' });
  });
}
function clearAllArchives(){
  mcConfirm('⚠ ATTENTION\n\nVous êtes sur le point d\'effacer TOUS les contrats archivés (en attente + validés).\n\nCette action est IRRÉVERSIBLE.\n\nContinuer ?', { title: '🗑 Effacer les archives', okText: 'Effacer' })
    .then(function(ok){
      if (!ok) return false;
      return requireOrgCode('Saisissez le code pour confirmer la suppression totale.');
    })
    .then(function(ok){
      if (!ok) return;
      try { localStorage.removeItem(MC_ARCHIVE_KEY); } catch(e){}
      updateArchivesCount();
      refreshAdminStats();
      if (document.getElementById('panel-archives').classList.contains('active')) renderArchivesList();
      mcAlert('✓ Toutes les archives ont été effacées.', { title: 'Succès' });
    });
}
function refreshAdminStats(){
  var c = document.getElementById('admin-stats');
  if (!c) return;
  var list = getArchives();
  var pending = list.filter(function(r){ return r.status === 'pending'; }).length;
  var validated = list.filter(function(r){ return r.status === 'validated'; }).length;
  var byType = {};
  list.forEach(function(r){ byType[r.type] = (byType[r.type] || 0) + 1; });
  var oldest = list.length ? list[list.length - 1].submittedAt || list[list.length - 1].validatedAt : null;
  var html = ''
    + '<div class="admin-stat"><div class="admin-stat-label">Total contrats</div><div class="admin-stat-value">' + list.length + '</div></div>'
    + '<div class="admin-stat" style="border-left-color:#ffab40"><div class="admin-stat-label">⏳ En attente</div><div class="admin-stat-value" style="color:#ffab40">' + pending + '</div></div>'
    + '<div class="admin-stat" style="border-left-color:#00e676"><div class="admin-stat-label">✓ Validés</div><div class="admin-stat-value" style="color:#00e676">' + validated + '</div></div>';
  Object.keys(byType).forEach(function(t){
    var meta = CONTRACT_LABELS[t] || { label: t, icon: '📄' };
    html += '<div class="admin-stat"><div class="admin-stat-label">' + meta.icon + ' ' + meta.label.replace('Contrat ', '') + '</div><div class="admin-stat-value">' + byType[t] + '</div></div>';
  });
  c.innerHTML = html;
}
// Refresh stats à chaque ouverture de la section admin
document.querySelector('a[href="admin.html"]').addEventListener('click', function(){
  setTimeout(refreshAdminStats, 100);
});
refreshAdminStats();

// ============================================================================
// === INTÉGRATIONS NOVA === (injectées dynamiquement sur toutes les pages MC)
// ============================================================================
// Master Clash est un projet de l'Association NOVA. Ce bloc applique partout :
//   1. Bouton "← Retour NOVA" en haut de la nav
//   2. Footer NOVA en bas de chaque page (bandeau institutionnel)
//   3. Mise à jour de la mention "demande à BoulaTV" pour citer NOVA
// ============================================================================
(function(){
  // Master Clash vit sous /projets/master-clash/ dans le portail NOVA.
  // L'URL relative remonte au site NOVA en restant dans la même fenêtre.
  var NOVA_URL = '../../index.html';

  // 1. Bouton "Retour NOVA" dans la nav
  function injectReturnNovaBtn(){
    var nav = document.querySelector('.nav-links');
    if (!nav || nav.querySelector('.nav-back-nova')) return;
    var a = document.createElement('a');
    a.href = NOVA_URL;
    a.className = 'nav-back-nova';
    a.title = 'Retour vers le site officiel de l\'association NOVA';
    a.style.cssText = 'background:linear-gradient(135deg,#1f2d4a,#16223C);color:#fbf9f3;padding:6px 14px;border-radius:4px;border:1px solid #b89c5e;display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:600;letter-spacing:0.5px;';
    a.innerHTML = '<span class="nav-icon" style="font-size:14px;">←</span><span class="nav-text">Retour NOVA</span>';
    nav.insertBefore(a, nav.firstChild);
  }

  // 2. Footer NOVA sur toutes les pages
  function injectNovaFooter(){
    if (document.querySelector('.nova-footer-banner')) return;
    var banner = document.createElement('footer');
    banner.className = 'nova-footer-banner';
    banner.style.cssText = 'background:linear-gradient(135deg,#1f2d4a 0%,#16223C 100%);color:#fbf9f3;padding:24px 20px;text-align:center;border-top:2px solid #b89c5e;font-family:\'EB Garamond\',\'Times New Roman\',serif;font-size:13px;letter-spacing:0.5px;line-height:1.65;margin-top:60px;';
    banner.innerHTML =
      '<div style="max-width:780px;margin:0 auto;">'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;letter-spacing:5px;color:#fbf9f3;margin-bottom:6px;font-weight:700;">'
      + 'MASTER CLASH <span style="color:#b89c5e;margin:0 8px;">×</span> <span style="color:#b89c5e;">NOVA</span>'
      + '</div>'
      + '<div style="font-style:italic;color:#aabbc8;margin-bottom:10px;">'
      + 'Master Clash est un événement organisé et porté par l\'<strong style="color:#fbf9f3;font-style:normal;">Association NOVA</strong> — <em>Nouvelle Organisation Vie Associative</em>.<br>'
      + 'Association à but non lucratif déclarée auprès du département de la Vie Civile, conforme au Code des Taxes, du Travail et des Entreprises (T.T.E. — Chap. VIII).'
      + '</div>'
      + '<div style="margin:14px 0 8px 0;color:#b89c5e;font-size:11px;letter-spacing:2px;font-variant:small-caps;">État de San Andreas — Los Santos</div>'
      + '<a href="' + NOVA_URL + '" '
      +   'style="display:inline-block;margin-top:8px;background:transparent;color:#b89c5e;border:1px solid #b89c5e;padding:6px 16px;border-radius:3px;text-decoration:none;font-size:11.5px;letter-spacing:1.5px;font-variant:small-caps;transition:all 0.25s;" '
      +   'onmouseover="this.style.background=\'#b89c5e\';this.style.color=\'#1f2d4a\';" '
      +   'onmouseout="this.style.background=\'transparent\';this.style.color=\'#b89c5e\';">'
      + '→ Découvrir l\'association NOVA'
      + '</a>'
      + '</div>';
    document.body.appendChild(banner);
  }

  // 3. Reformulation des mentions "demande à BoulaTV" pour citer NOVA
  function updateBoulaTVMentions(){
    document.querySelectorAll('p, span, div').forEach(function(el){
      // ne pas re-traiter ; et ne traiter que les nodes texte directs
      if (el.dataset && el.dataset.novaUpdated) return;
      if (el.children.length > 0 && !el.querySelector('strong, em, b, i')) {
        // Si l'élément a des enfants complexes, on évite d'écraser
      }
      // Cherche le texte exact
      var html = el.innerHTML;
      if (html.indexOf('demande à BoulaTV') !== -1 && el.children.length === 0) {
        el.innerHTML = html.replace(
          /demande à BoulaTV\s*\.?/g,
          'demande à <strong style="color:#b89c5e;">BoulaTV</strong>, président fondateur de l\'<strong style="color:#b89c5e;">Association NOVA</strong>.'
        );
        if (el.dataset) el.dataset.novaUpdated = '1';
      }
    });
  }

  function injectAll(){
    try { injectReturnNovaBtn(); } catch(e) { console.error('NOVA btn err:', e); }
    try { injectNovaFooter();    } catch(e) { console.error('NOVA footer err:', e); }
    try { updateBoulaTVMentions();} catch(e) { console.error('NOVA mention err:', e); }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectAll);
  } else {
    injectAll();
  }
})();

