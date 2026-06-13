// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  user: null,
  token: null,
  currentPage: 'chat',
  currentConvId: null,
  isStreaming: false,
  attachedFile: null,
  attachedPreview: null,
  analyzeFile: null,
  marketData: null,
  guestHistory: [],
  guestCount: 0,
};
const GUEST_LIMIT = 3;

// ─── Utils ────────────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showToast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.add('hidden'), 3500);
}

function formatPrice(n) {
  if (n == null) return '—';
  if (n === 0) return '$0.00';
  if (n >= 1) return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return '$' + n.toFixed(4);
  return '$' + n.toFixed(8);
}
function formatNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K';
  return '$' + n.toFixed(2);
}
function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return new Date(date).toLocaleDateString();
}
function dateLabel(date) {
  const d = new Date(date), now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest = new Date(+today - 86400000);
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (+dd === +today) return 'Today';
  if (+dd === +yest) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
function initials(name) {
  return name?.slice(0, 2)?.toUpperCase() || '?';
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^-{3,}$/gm, '<hr>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n(?!<)/g, '<br>')
    .replace(/^(?!<[hupboapsdt])(.+)$/gm, m => m.trim() ? m : '');
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function showAuthModal(mode = 'login') {
  const modal = $('#authModal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (mode === 'register') {
    $('#loginForm').classList.add('hidden');
    $('#registerForm').classList.remove('hidden');
  } else {
    $('#registerForm').classList.add('hidden');
    $('#loginForm').classList.remove('hidden');
  }
}
window.showAuthModal = showAuthModal;

function hideAuthModal() {
  $('#authModal').classList.add('hidden');
  document.body.style.overflow = '';
  $('#loginError').classList.add('hidden');
  $('#registerError').classList.add('hidden');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('ka_token', token);
  localStorage.setItem('ka_user', JSON.stringify(user));
}
function clearAuth() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('ka_token');
  localStorage.removeItem('ka_user');
}
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` };
}

async function checkAuth() {
  const savedToken = localStorage.getItem('ka_token');
  if (!savedToken) return false;
  try {
    const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } });
    if (!r.ok) { clearAuth(); return false; }
    const { user } = await r.json();
    state.token = savedToken;
    state.user = user;
    return true;
  } catch { return false; }
}

function updateTopbarAuth() {
  // Always show sign-in/sign-up buttons
  $('#guestTopbarAuth').classList.remove('hidden');
  
  if (state.user) {
    $('#userTopbarAuth').classList.remove('hidden');
    $('#sidebar').classList.remove('sidebar-hidden');
    const av = $('#topbarAvatar');
    if (av) av.textContent = initials(state.user.username);
    $('#sidebarAvatar').textContent = initials(state.user.username);
    $('#sidebarUsername').textContent = state.user.username;
    $('#sidebarEmail').textContent = state.user.email;
  } else {
    $('#userTopbarAuth').classList.add('hidden');
    $('#sidebar').classList.add('sidebar-hidden');
  }
}

function afterLogin() {
  hideAuthModal();
  updateTopbarAuth();
  state.guestHistory = [];
  state.guestCount = 0;
  localStorage.removeItem('ka_guest_count');
  startNewChat();
  navigateTo('chat');
}

function initAuth() {
  $('#showRegister').addEventListener('click', () => {
    $('#loginForm').classList.add('hidden');
    $('#registerForm').classList.remove('hidden');
    $('#loginError').classList.add('hidden');
  });
  $('#showLogin').addEventListener('click', () => {
    $('#registerForm').classList.add('hidden');
    $('#loginForm').classList.remove('hidden');
    $('#registerError').classList.add('hidden');
  });
  $('#authBackdrop').addEventListener('click', hideAuthModal);
  $('#authCloseBtn').addEventListener('click', hideAuthModal);

  async function doLogin() {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const errEl = $('#loginError');
    if (!email || !password) { errEl.textContent = 'Please fill in all fields'; errEl.classList.remove('hidden'); return; }
    const btn = $('#loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    errEl.classList.add('hidden');
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await r.json();
      if (!r.ok) { errEl.textContent = data.error || 'Login failed'; errEl.classList.remove('hidden'); return; }
      saveAuth(data.token, data.user);
      afterLogin();
    } catch { errEl.textContent = 'Connection error. Try again.'; errEl.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Sign In'; }
  }
  $('#loginBtn').addEventListener('click', doLogin);
  $('#loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  async function doRegister() {
    const username = $('#regUsername').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    const errEl = $('#registerError');
    if (!username || !email || !password) { errEl.textContent = 'Please fill in all fields'; errEl.classList.remove('hidden'); return; }
    const btn = $('#registerBtn');
    btn.disabled = true; btn.textContent = 'Creating account…';
    errEl.classList.add('hidden');
    try {
      const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
      const data = await r.json();
      if (!r.ok) { errEl.textContent = data.error || 'Registration failed'; errEl.classList.remove('hidden'); return; }
      saveAuth(data.token, data.user);
      afterLogin();
    } catch { errEl.textContent = 'Connection error. Try again.'; errEl.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Create Account'; }
  }
  $('#registerBtn').addEventListener('click', doRegister);
  $('#regPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });

  $('#logoutBtn').addEventListener('click', async () => {
    if (!confirm('Sign out of KhaysAlpha AI?')) return;
    await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
    clearAuth();
    state.guestHistory = [];
    state.guestCount = 0;
    updateTopbarAuth();
    startNewChat();
  });
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(page, convId = null) {
  // Require login for history and image studio
  if (!state.user && (page === 'history' || page === 'image')) {
    showAuthModal('login');
    return;
  }
  state.currentPage = page;
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${page}`)?.classList.add('active');
  $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  if (window.innerWidth <= 840) closeSidebar();
  if (page === 'chat') {
    if (convId && convId !== state.currentConvId) { state.currentConvId = convId; loadConversation(convId); }
    else if (!convId) startNewChat();
  } else if (page === 'market') {
    loadMarket();
  } else if (page === 'history') {
    loadHistory();
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function openSidebar() { $('#sidebar').classList.add('open'); $('#overlay').classList.add('visible'); }
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('visible'); }

// ─── Guest Wall ───────────────────────────────────────────────────────────────
function showGuestWall() {
  const msgs = $('#chatMessages');
  if (msgs.querySelector('.guest-wall')) return;
  const div = document.createElement('div');
  div.className = 'guest-wall';
  div.innerHTML = `
    <img src="/logo.png" alt="KhaysAlpha AI" style="width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 0 16px rgba(201,162,39,0.4));margin-bottom:10px;"/>
    <h3 class="guest-wall-title">You've used your 3 free messages</h3>
    <p class="guest-wall-sub">Sign in or create a free account to keep chatting and save your conversations.</p>
    <div class="guest-wall-btns">
      <button class="auth-btn guest-wall-primary" onclick="showAuthModal('register')">Create free account</button>
      <button class="guest-wall-secondary" onclick="showAuthModal('login')">Sign in</button>
    </div>`;
  msgs.appendChild(div);
  scrollBottom();
  // Disable input
  $('#chatInput').disabled = true;
  $('#chatInput').placeholder = 'Sign in to continue chatting...';
  $('#sendBtn').disabled = true;
  $('#attachBtn').disabled = true;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function startNewChat() {
  state.currentConvId = null;
  state.isStreaming = false;
  clearAttachment();
  if (!state.user) {
    state.guestHistory = [];
    state.guestCount = parseInt(localStorage.getItem('ka_guest_count') || '0');
  }
  renderWelcome();
  // Re-enable input in case it was disabled by guest wall
  const inp = $('#chatInput');
  if (inp) {
    if (state.user || state.guestCount < GUEST_LIMIT) {
      inp.disabled = false;
      inp.placeholder = 'Message KhaysAlpha AI...';
      $('#sendBtn').disabled = false;
      $('#attachBtn').disabled = false;
    } else {
      showGuestWall();
    }
  }
  updateSendBtn();
}

function renderWelcome() {
  const msgs = $('#chatMessages');
  msgs.innerHTML = `
    <div class="welcome">
      <img src="/logo.png" alt="KhaysAlpha AI" class="welcome-logo"/>
      <h2 class="welcome-title">KhaysAlpha AI</h2>
      <p class="welcome-sub">Your intelligent AI assistant. Ask anything — crypto, markets, science, relationships, travel, and more.</p>
      ${!state.user ? `<p class="guest-hint">${GUEST_LIMIT - state.guestCount} free message${(GUEST_LIMIT - state.guestCount) !== 1 ? 's' : ''} remaining · <button class="auth-link" onclick="showAuthModal('login')">Sign in</button> for unlimited access</p>` : ''}
    </div>`;
}

function appendUserMessage(text, imageData) {
  const msgs = $('#chatMessages');
  const welcome = msgs.querySelector('.welcome');
  if (welcome) welcome.remove();
  const guestWall = msgs.querySelector('.guest-wall');
  if (guestWall) return;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const row = document.createElement('div');
  row.className = 'message-row user';
  const avatarLabel = state.user ? initials(state.user.username) : 'G';
  row.innerHTML = `
    <div class="msg-avatar user-av">${avatarLabel}</div>
    <div class="msg-body">
      <div class="msg-bubble user-bubble">
        ${imageData ? `<img src="${imageData}" alt="Attached" class="msg-image"/>` : ''}
        ${text ? `<span>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>` : ''}
      </div>
      <span class="msg-time">${time}</span>
    </div>`;
  msgs.appendChild(row);
  scrollBottom();
}

function appendAIMessage() {
  const msgs = $('#chatMessages');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const row = document.createElement('div');
  row.className = 'message-row';
  row.innerHTML = `
    <div class="msg-avatar ai"><img src="/logo.png" alt="AI" style="width:24px;height:24px;object-fit:contain;border-radius:4px;"/></div>
    <div class="msg-body">
      <div class="msg-bubble ai-bubble" id="streamTarget">
        <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
      </div>
      <span class="msg-time">${time}</span>
    </div>`;
  msgs.appendChild(row);
  scrollBottom();
  return $('#streamTarget');
}

function appendAIImageMessage(imageUrl, caption) {
  const msgs = $('#chatMessages');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const row = document.createElement('div');
  row.className = 'message-row';
  row.innerHTML = `
    <div class="msg-avatar ai"><img src="/logo.png" alt="AI" style="width:24px;height:24px;object-fit:contain;border-radius:4px;"/></div>
    <div class="msg-body">
      <div class="msg-bubble ai-bubble">
        <img src="${imageUrl}" alt="Generated" class="msg-image" style="max-height:320px;"/>
        <p style="margin-top:8px;font-size:12px;color:var(--text2)">${caption}</p>
        <div style="margin-top:10px">
          <a href="${imageUrl}" download="khaysalpha-image.png" style="font-size:12px;padding:6px 12px;background:var(--gold-dim);border:1px solid rgba(201,162,39,0.25);color:var(--gold);border-radius:7px;display:inline-flex;align-items:center;gap:5px;text-decoration:none;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
        </div>
      </div>
      <span class="msg-time">${time}</span>
    </div>`;
  msgs.appendChild(row);
  scrollBottom();
}

function scrollBottom() {
  const msgs = $('#chatMessages');
  requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
}

async function streamFromResponse(response, bubble) {
  let accumulated = '';
  let buffer = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const obj = JSON.parse(line.slice(6));
        if (obj.text) { accumulated += obj.text; bubble.innerHTML = renderMarkdown(accumulated); scrollBottom(); }
        if (obj.error) bubble.innerHTML = `<span style="color:var(--red)">${obj.error}</span>`;
      } catch {}
    }
  }
  return accumulated;
}

async function loadConversation(id) {
  const msgs = $('#chatMessages');
  msgs.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><div class="spinner"></div></div>';
  try {
    const r = await fetch(`/api/conversations/${id}`, { headers: { Authorization: `Bearer ${state.token}` } });
    if (!r.ok) { startNewChat(); return; }
    const conv = await r.json();
    msgs.innerHTML = '';
    for (const msg of conv.messages || []) {
      if (msg.role === 'user') {
        appendUserMessage(msg.content, msg.image_data);
      } else {
        const bubble = appendAIMessage();
        if (msg.image_data) {
          bubble.closest('.msg-body').querySelector('.msg-bubble').innerHTML =
            `<img src="${msg.image_data}" alt="Generated" class="msg-image" style="max-height:320px;"/>
             <p style="margin-top:8px;font-size:12px;color:var(--text2)">${msg.content}</p>`;
        } else {
          bubble.innerHTML = renderMarkdown(msg.content);
        }
      }
    }
    scrollBottom();
  } catch { showToast('Failed to load conversation', 'error'); startNewChat(); }
}

// ─── Guest Send ───────────────────────────────────────────────────────────────
async function sendGuestMessage(content) {
  if (state.guestCount >= GUEST_LIMIT) { showGuestWall(); return; }

  state.isStreaming = true;
  updateSendBtn();
  state.guestHistory.push({ role: 'user', content });
  appendUserMessage(content, null);
  const bubble = appendAIMessage();

  try {
    const r = await fetch('/api/chat/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.guestHistory }),
    });
    if (!r.ok || !r.body) throw new Error('Request failed');
    const reply = await streamFromResponse(r, bubble);
    if (reply) state.guestHistory.push({ role: 'assistant', content: reply });
    state.guestCount++;
    localStorage.setItem('ka_guest_count', state.guestCount);
    const remaining = GUEST_LIMIT - state.guestCount;
    if (remaining <= 0) {
      setTimeout(() => showGuestWall(), 600);
    } else {
      // Update welcome hint if visible
      const hint = document.querySelector('.guest-hint');
      if (hint) hint.innerHTML = `${remaining} free message${remaining !== 1 ? 's' : ''} remaining · <button class="auth-link" onclick="showAuthModal('login')">Sign in</button> for unlimited access`;
    }
  } catch {
    bubble.innerHTML = '<span style="color:var(--red)">Connection failed. Please try again.</span>';
  }
  state.isStreaming = false;
  updateSendBtn();
}

// ─── Authenticated Send ───────────────────────────────────────────────────────
async function sendMessage(text) {
  const content = text ?? $('#chatInput').value.trim();
  const file = state.attachedFile;
  const preview = state.attachedPreview;
  if ((!content && !file) || state.isStreaming) return;

  // Route guests to guest endpoint
  if (!state.user) {
    $('#chatInput').value = '';
    autoResize($('#chatInput'));
    clearAttachment();
    return sendGuestMessage(content);
  }

  $('#chatInput').value = '';
  autoResize($('#chatInput'));
  state.isStreaming = true;
  updateSendBtn();
  clearAttachment();

  if (!state.currentConvId) {
    try {
      const r = await fetch('/api/conversations', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ title: content.slice(0, 60) || 'New Chat' }) });
      if (r.status === 401) { clearAuth(); updateTopbarAuth(); showAuthModal('login'); return; }
      const conv = await r.json();
      state.currentConvId = conv.id;
    } catch { showToast('Failed to start conversation', 'error'); state.isStreaming = false; updateSendBtn(); return; }
  }

  // Image analysis
  if (file) {
    appendUserMessage(content || 'Analyze this image', preview);
    const bubble = appendAIMessage();
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('prompt', content || 'Analyze this image in detail');
      fd.append('conversationId', state.currentConvId);
      const r = await fetch('/api/analyze-image', { method: 'POST', headers: { Authorization: `Bearer ${state.token}` }, body: fd });
      const data = await r.json();
      bubble.innerHTML = renderMarkdown(data.analysis || data.error || 'Analysis complete.');
    } catch { bubble.innerHTML = '<em style="color:var(--red)">Analysis failed. Please try again.</em>'; }
    state.isStreaming = false; updateSendBtn(); return;
  }

  const isImgReq = /\b(generate|create|draw|make|design|paint|render|produce)\b.{0,30}\b(image|picture|photo|art|illustration|wallpaper|icon|portrait|logo|banner)\b/i.test(content);
  appendUserMessage(content, null);

  if (isImgReq) {
    const bubble = appendAIMessage();
    bubble.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--gold-light);font-size:13px;"><div class="spinner"></div> Creating your image…</div>';
    try {
      const r = await fetch('/api/generate-image', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ prompt: content, conversationId: state.currentConvId }) });
      const data = await r.json();
      if (data.imageUrl) {
        bubble.closest('.message-row').remove();
        appendAIImageMessage(data.imageUrl, `Created for: "${content}"`);
      } else {
        bubble.innerHTML = `<span style="color:var(--red)">Image creation failed: ${data.error || 'Unknown error'}</span>`;
      }
    } catch { bubble.innerHTML = `<span style="color:var(--red)">Image creation failed. Please try again.</span>`; }
    state.isStreaming = false; updateSendBtn(); return;
  }

  const bubble = appendAIMessage();
  try {
    const r = await fetch(`/api/conversations/${state.currentConvId}/chat`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ message: content }),
    });
    if (!r.ok || !r.body) throw new Error('Request failed');
    await streamFromResponse(r, bubble);
  } catch { bubble.innerHTML = '<span style="color:var(--red)">Connection failed. Please try again.</span>'; }
  state.isStreaming = false; updateSendBtn(); scrollBottom();
}

function updateSendBtn() {
  const btn = $('#sendBtn');
  const hasInput = !!$('#chatInput')?.value.trim() || !!state.attachedFile;
  btn.disabled = state.isStreaming || !hasInput;
}

function clearAttachment() {
  state.attachedFile = null; state.attachedPreview = null;
  const ap = $('#attachPreview');
  ap.innerHTML = ''; ap.classList.add('hidden');
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

// ─── Market ───────────────────────────────────────────────────────────────────
async function loadMarket() {
  $('#marketList').innerHTML = '<div class="market-loading"><div class="spinner"></div><p>Loading market data…</p></div>';
  $('#globalStats').innerHTML = '';
  try {
    const r = await fetch('/api/market');
    const data = await r.json();
    state.marketData = data;
    renderMarket(data, '');
  } catch { $('#marketList').innerHTML = '<div class="market-empty">Failed to load. Check connection.</div>'; }
}

function renderMarket(data, filter) {
  const statsEl = $('#globalStats');
  const listEl = $('#marketList');
  const g = data.global || {};
  statsEl.innerHTML = [
    { label: 'Total Market Cap', value: formatNum(g.total_market_cap?.usd) },
    { label: '24h Volume', value: formatNum(g.total_volume?.usd) },
    { label: 'BTC Dominance', value: ((g.market_cap_percentage?.btc) || 0).toFixed(1) + '%' },
    { label: 'Active Coins', value: (g.active_cryptocurrencies || 0).toLocaleString() },
  ].map(s => `<div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('');

  let tokens = (data.tokens || []).filter(t =>
    !filter || t.name.toLowerCase().includes(filter) || t.symbol.toLowerCase().includes(filter)
  );
  if (!tokens.length) { listEl.innerHTML = '<div class="market-empty">No tokens found.</div>'; return; }
  listEl.innerHTML = `
    <div class="market-table-header">
      <div style="text-align:right">#</div><div>Token</div>
      <div style="text-align:right">Price</div>
      <div style="text-align:right">24h</div>
      <div style="text-align:right" class="market-vol">Volume</div>
    </div>
    ${tokens.map((t, i) => {
      const up = (t.price_change_percentage_24h || 0) >= 0;
      const isCapx = t.isCapx;
      const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.symbol)}&background=1a1000&color=c9a227&size=60&bold=true&rounded=true`;
      return `
        <div class="market-row ${isCapx ? 'capx-row' : ''}">
          <div class="market-rank">${i + 1}</div>
          <div class="market-coin">
            <img class="coin-logo" src="${t.image || fallbackLogo}" alt="${t.name}" onerror="this.onerror=null;this.src='${fallbackLogo}'"/>
            <div>
              <div class="coin-name">${t.symbol.toUpperCase()}${isCapx ? '<span class="coin-badge">CAPX</span>' : ''}</div>
              <div class="coin-symbol">${t.name}</div>
            </div>
          </div>
          <div class="market-price">${formatPrice(t.current_price)}</div>
          <div class="market-change"><span class="change-badge ${up ? 'change-up' : 'change-down'}">${up ? '▲' : '▼'} ${Math.abs(t.price_change_percentage_24h || 0).toFixed(2)}%</span></div>
          <div class="market-vol">${formatNum(t.total_volume)}</div>
        </div>`;
    }).join('')}`;
}

// ─── Image Studio ─────────────────────────────────────────────────────────────
const EXAMPLES = [
  'Golden city skyline at night with neon lights',
  'Futuristic AI robot with gold armor, cinematic',
  'Abstract cryptocurrency visualization in space',
  'Majestic lion made of golden coins',
  'Cyberpunk market district with holographic charts',
  'Sunrise over a blockchain mountain range',
];

function initImageStudio() {
  const chips = $('#exampleChips');
  chips.innerHTML = EXAMPLES.map((e, i) => `<button class="example-chip" data-i="${i}">${e}</button>`).join('');
  $$('.example-chip').forEach(c => {
    c.addEventListener('click', () => { $('#imagePrompt').value = EXAMPLES[+c.dataset.i]; });
  });

  $('#generateBtn').addEventListener('click', async () => {
    if (!state.user) { showAuthModal('login'); return; }
    const prompt = $('#imagePrompt').value.trim();
    if (!prompt) { showToast('Enter a description first', 'error'); return; }
    const btn = $('#generateBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:15px;height:15px;border-width:2px;flex-shrink:0;"></div> Creating image…';
    $('#generatedResult').classList.add('hidden');
    try {
      const r = await fetch('/api/generate-image', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ prompt }) });
      const data = await r.json();
      if (data.imageUrl) {
        const result = $('#generatedResult');
        result.innerHTML = `
          <img src="${data.imageUrl}" alt="Generated" onerror="this.style.display='none'"/>
          <div class="gen-result-footer">
            <span class="gen-result-label">KhaysAlpha AI Image Studio</span>
            <div style="display:flex;gap:7px;">
              <button id="regenBtn" class="btn-outline" style="padding:6px 12px;font-size:12px;">↻ Regenerate</button>
              <a href="${data.imageUrl}" download="khaysalpha-image.png" class="btn-primary" style="padding:6px 12px;font-size:12px;color:#000;text-decoration:none;">↓ Download</a>
            </div>
          </div>`;
        result.classList.remove('hidden');
        $('#regenBtn').addEventListener('click', () => { result.classList.add('hidden'); btn.click(); });
      } else {
        showToast(data.error || 'Image creation failed', 'error');
      }
    } catch { showToast('Image creation failed. Please try again.', 'error'); }
    btn.disabled = false;
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate Image';
  });

  const uploadZone = $('#uploadZone');
  const analyzeInput = $('#analyzeFileInput');
  uploadZone.addEventListener('click', () => analyzeInput.click());
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); const f = e.dataTransfer?.files?.[0]; if (f) handleAnalyzeFile(f); });
  analyzeInput.addEventListener('change', () => { const f = analyzeInput.files?.[0]; if (f) handleAnalyzeFile(f); });
  $('#removeUpload').addEventListener('click', () => {
    state.analyzeFile = null;
    $('#uploadPreviewWrap').classList.add('hidden');
    $('#uploadZone').classList.remove('hidden');
    analyzeInput.value = '';
    $('#analysisResult').classList.add('hidden');
  });

  $('#analyzeBtn').addEventListener('click', async () => {
    if (!state.analyzeFile) { showToast('Upload an image first', 'error'); return; }
    const btn = $('#analyzeBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:15px;height:15px;border-width:2px;flex-shrink:0;"></div> Analyzing…';
    $('#analysisResult').classList.add('hidden');
    try {
      const fd = new FormData();
      fd.append('image', state.analyzeFile);
      fd.append('prompt', $('#analyzePrompt').value || 'Describe and analyze this image thoroughly.');
      const r = await fetch('/api/analyze-image', { method: 'POST', headers: { Authorization: `Bearer ${state.token}` }, body: fd });
      const data = await r.json();
      const result = $('#analysisResult');
      result.textContent = data.analysis || data.error || 'Analysis complete.';
      result.classList.remove('hidden');
    } catch { showToast('Analysis failed', 'error'); }
    btn.disabled = false;
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Analyze Image';
  });
}

function handleAnalyzeFile(file) {
  state.analyzeFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    $('#uploadPreviewImg').src = reader.result;
    $('#uploadPreviewWrap').classList.remove('hidden');
    $('#uploadZone').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

// ─── History ──────────────────────────────────────────────────────────────────
async function loadHistory() {
  const listEl = $('#historyList');
  const searchEl = $('#historySearch');
  listEl.innerHTML = '<div style="display:flex;justify-content:center;padding:40px;"><div class="spinner"></div></div>';
  try {
    const r = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${state.token}` } });
    if (r.status === 401) { clearAuth(); updateTopbarAuth(); showAuthModal('login'); return; }
    const convs = await r.json();
    $('#historyCount').textContent = `${convs.length} conversation${convs.length !== 1 ? 's' : ''}`;

    function renderList(filter) {
      const filtered = convs.filter(c => !filter || c.title.toLowerCase().includes(filter.toLowerCase()));
      if (!filtered.length) {
        listEl.innerHTML = `<div class="history-empty">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <p>${filter ? 'No matching conversations' : 'No conversations yet'}</p>
          ${!filter ? '<p style="color:var(--gold);cursor:pointer;margin-top:3px;" onclick="navigateTo(\'chat\')">Start your first chat →</p>' : ''}
        </div>`; return;
      }
      const groups = {};
      filtered.forEach(c => { const l = dateLabel(c.created_at); if (!groups[l]) groups[l] = []; groups[l].push(c); });
      listEl.innerHTML = Object.entries(groups).map(([label, items]) => `
        <div class="history-date-label">${label}</div>
        ${items.map(c => `
          <div class="history-item" data-id="${c.id}">
            <div class="hist-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <div class="hist-info">
              <div class="hist-title">${c.title.replace(/</g,'&lt;')}</div>
              <div class="hist-time">${timeAgo(c.updated_at || c.created_at)}</div>
            </div>
            <button class="hist-delete" data-delete="${c.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>`).join('')}`).join('');

      $$('.history-item').forEach(item => {
        item.addEventListener('click', e => { if (e.target.closest('.hist-delete')) return; navigateTo('chat', parseInt(item.dataset.id)); });
      });
      $$('.hist-delete').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          if (!confirm('Delete this conversation?')) return;
          const id = parseInt(btn.dataset.delete);
          await fetch(`/api/conversations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } });
          const idx = convs.findIndex(c => c.id === id);
          if (idx > -1) convs.splice(idx, 1);
          $('#historyCount').textContent = `${convs.length} conversation${convs.length !== 1 ? 's' : ''}`;
          renderList(searchEl.value);
          showToast('Deleted', 'success');
        });
      });
    }
    renderList('');
    searchEl.addEventListener('input', () => renderList(searchEl.value));
  } catch { listEl.innerHTML = '<div class="history-empty">Failed to load history.</div>'; }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initAuth();
  initImageStudio();

  // Sidebar controls
  $('#menuBtn').addEventListener('click', openSidebar);
  $('#closeSidebar').addEventListener('click', closeSidebar);
  $('#overlay').addEventListener('click', closeSidebar);
  $('#newChatBtn').addEventListener('click', () => navigateTo('chat'));
  $('#newChatTopBtn')?.addEventListener('click', () => navigateTo('chat'));
  $('#historyNewChat').addEventListener('click', () => navigateTo('chat'));

  $$('.nav-item').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.page); });
  });

  $$('#imageTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('#imageTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      $(`#tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  const chatInput = $('#chatInput');
  chatInput.addEventListener('input', () => { autoResize(chatInput); updateSendBtn(); });
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  $('#sendBtn').addEventListener('click', () => sendMessage());

  $('#attachBtn').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', () => {
    const file = $('#fileInput').files?.[0];
    if (!file) return;
    if (!state.user) { showAuthModal('login'); return; }
    state.attachedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      state.attachedPreview = reader.result;
      const ap = $('#attachPreview');
      ap.innerHTML = `<div class="attach-preview-inner"><img src="${reader.result}" alt="Attached" class="attach-img"/><button class="remove-attach" id="removeAttach">✕</button></div>`;
      ap.classList.remove('hidden');
      $('#removeAttach').addEventListener('click', clearAttachment);
      updateSendBtn();
    };
    reader.readAsDataURL(file);
  });

  $('#marketSearch').addEventListener('input', e => { if (state.marketData) renderMarket(state.marketData, e.target.value.toLowerCase()); });
  $('#refreshMarket').addEventListener('click', () => {
    const btn = $('#refreshMarket'); btn.classList.add('spinning');
    loadMarket().finally(() => btn.classList.remove('spinning'));
  });

  // Check auth — app already visible, just update UI
  const authed = await checkAuth();
  state.guestCount = parseInt(localStorage.getItem('ka_guest_count') || '0');

  updateTopbarAuth();
  $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.page === 'chat'));
  renderWelcome();
  updateSendBtn();

  // If guest already hit limit, show wall immediately
  if (!authed && state.guestCount >= GUEST_LIMIT) {
    showGuestWall();
  }
});
