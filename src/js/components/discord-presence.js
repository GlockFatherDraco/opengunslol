(function () {
  'use strict';

  const FETCH_INTERVAL_MS = 30000;
  const FETCH_TIMEOUT_MS = 7000;
  const LANYARD_API = (id) => `https://api.lanyard.rest/v1/users/${id}`;
  let updateInterval = null;

  const $ = (s) => document.querySelector(s);
  const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const setSrc = (img, src) => { if (img && img.src !== src) img.src = src; };

  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (err) {
      console.error('Clipboard failed', err);
      return false;
    }
  }

  async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { signal: controller.signal, cache: 'no-store' });
    } finally {
      clearTimeout(id);
    }
  }

  function activityText(data = {}) {
    const status = data.discord_status || 'offline';
    if (status === 'offline') return 'Offline';
    if (data.listening_to_spotify && data.spotify) {
      const s = data.spotify;
      return `Listening to ${s.song} by ${s.artist}`;
    }
    const activities = Array.isArray(data.activities) ? data.activities : [];
    if (!activities.length) return 'No active activity';
    const nonCustom = activities.find(a => a.type !== 4);
    const custom = activities.find(a => a.type === 4);
    if (nonCustom) {
      switch (nonCustom.type) {
        case 0: return `Playing ${nonCustom.name}`;
        case 1: return `Streaming ${nonCustom.name}`;
        case 2: return `Listening to ${nonCustom.name}`;
        case 3: return `Watching ${nonCustom.name}`;
        case 5: return `Competing in ${nonCustom.name}`;
        default: return nonCustom.name || 'Active';
      }
    }
    return (custom && (custom.state || custom.name)) || 'currently doing nothing';
  }

  function updateUI(elements, data) {
    if (!data) return;
    const user = data.discord_user || {};
    if (elements.avatar) {
      const isAnimated = typeof user.avatar === 'string' && user.avatar.startsWith('a_');
      const ext = isAnimated ? 'gif' : 'png';
      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;
      setSrc(elements.avatar, avatarUrl);
      setAttr(elements.avatar, 'alt', `${user.username || 'User'} avatar`);
    }
    if (elements.username) {
      const display = user.display_name || user.global_name || (user.username ? `${user.username}#${user.discriminator}` : 'Unknown user');
      setText(elements.username, display);
    }
    if (elements.statusIcon) {
      const apiStatus = data.discord_status || 'offline';
      elements.statusIcon.className = `discord-status-icon ${apiStatus === 'offline' ? 'invisible' : apiStatus}`;
    }
    if (elements.activity) setText(elements.activity, activityText(data));
  }

  function getUserIdFromDom() {
    return $('meta[name="discord-user-id"]')?.content
      || $('.discord-presence-badge')?.dataset.userId
      || null;
  }

  function initDiscordPresence() {
    const badge = $('.discord-presence-badge');
    const card = $('.discord-presence-card');
    if (!badge || !card) return;

    if (!badge.hasAttribute('tabindex')) badge.setAttribute('tabindex', '0');

    const elements = {
      avatar: $('.discord-avatar'),
      username: $('.discord-username'),
      activity: $('.discord-activity'),
      statusIcon: $('.discord-status-icon')
    };

    let lastPayloadJson = null;
    let hideTimer = null;

    const showCard = () => { clearTimeout(hideTimer); card.classList.add('visible'); };
    const hideCard = () => { hideTimer = setTimeout(() => card.classList.remove('visible'), 100); };

    async function fetchDiscordData() {
      const userId = getUserIdFromDom();
      if (!userId || userId === 'YOUR_DISCORD_USER_ID') {
        setText(elements.username, 'No user ID set');
        setText(elements.activity, 'Add a Discord ID to enable presence');
        return;
      }
      try {
        const res = await fetchWithTimeout(LANYARD_API(userId));
        if (!res) throw new Error('No response');
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            const j = JSON.stringify(json.data);
            if (j !== lastPayloadJson) {
              lastPayloadJson = j;
              updateUI(elements, json.data);
            }
            return;
          }
          setText(elements.username, 'Data error');
          setText(elements.activity, 'Unexpected payload');
          return;
        }
        if (res.status === 404) {
          setText(elements.username, 'User not found');
          setText(elements.activity, 'Check Discord user ID');
        } else {
          setText(elements.username, 'API error');
          setText(elements.activity, `Status: ${res.status}`);
        }
      } catch (err) {
        setText(elements.username, 'Connection error');
        setText(elements.activity, 'See console for details');
        console.error('Lanyard fetch error', err);
      }
    }

    badge.addEventListener('dblclick', async (e) => {
      e.preventDefault();
      try {
        const data = lastPayloadJson ? JSON.parse(lastPayloadJson) : null;
        const userId = data?.discord_user?.id;
        if (!userId) return;
        const url = `https://discord.com/users/${userId}`;
        await copyToClipboard(url);
      } catch (err) {
        console.error('Copy failed', err);
      }
    });

    ['mouseenter', 'focus'].forEach(ev => badge.addEventListener(ev, showCard));
    ['mouseleave'].forEach(ev => badge.addEventListener(ev, hideCard));
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', hideCard);
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { card.classList.remove('visible'); badge.blur(); }
    });

    fetchDiscordData();
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(fetchDiscordData, FETCH_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
      if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { initDiscordPresence };
  else window.initDiscordPresence = initDiscordPresence;
})();
