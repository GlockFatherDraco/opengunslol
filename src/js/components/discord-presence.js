(function () {
  'use strict';

  let updateInterval = null;
  const FETCH_INTERVAL_MS = 30000;
  const FETCH_TIMEOUT_MS = 7000;
  const KNOWN_STATUSES = ['online', 'idle', 'dnd', 'offline'];

  function q(sel) { return document.querySelector(sel); }
  function setTextIfChanged(el, txt) { if (el && el.textContent !== txt) el.textContent = txt; }
  function setAttrIfChanged(el, attr, val) { if (el && el.getAttribute(attr) !== val) el.setAttribute(attr, val); }
  function setSrcIfChanged(img, src) { if (img && img.src !== src) img.src = src; }

  function getUserIdFromDom() {
    return q('meta[name="discord-user-id"]')?.content
      || q('.discord-presence-badge')?.dataset.userId
      || null;
  }

  async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { }
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
    } catch (e) {
      console.error('Clipboard copy failed', e);
      return false;
    }
  }

  function activityTextFrom(ldata) {
    const status = ldata.discord_status;
    if (status === 'offline') return 'Offline';
    if (ldata.listening_to_spotify && ldata.spotify) {
      const s = ldata.spotify;
      return `Listening to ${s.song} by ${s.artist}`;
    }
    const activities = Array.isArray(ldata.activities) ? ldata.activities : [];
    if (!activities.length) return 'Currently doing nothing';
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
    if (custom) return custom.state || custom.name || 'Currently doing nothing';
    return 'Currently doing nothing';
  }

  function updateUI(elements, ldata) {
    if (!ldata) return;
    const user = ldata.discord_user || {};
    if (elements.avatar) {
      const isAnimated = typeof user.avatar === 'string' && user.avatar.startsWith('a_');
      const ext = isAnimated ? 'gif' : 'png';
      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0', 10) % 5}.png`;
      setSrcIfChanged(elements.avatar, avatarUrl);
      setAttrIfChanged(elements.avatar, 'alt', `${user.username || 'User'}'s avatar`);
    }
    if (elements.username) {
      const display = user.display_name || user.global_name || (user.username ? `${user.username}#${user.discriminator}` : 'Unknown user');
      setTextIfChanged(elements.username, display);
    }
    if (elements.statusIcon) {
      const apiStatus = ldata.discord_status || 'offline';
      const statusClass = apiStatus === 'offline' ? 'invisible' : apiStatus;
      elements.statusIcon.className = `discord-status-icon ${statusClass}`;
    }
    if (elements.activity) setTextIfChanged(elements.activity, activityTextFrom(ldata));
  }

  function initDiscordPresence() {
    const badge = q('.discord-presence-badge');
    const card = q('.discord-presence-card');
    const avatar = q('.discord-avatar');
    const username = q('.discord-username');
    const activity = q('.discord-activity');
    const statusIcon = q('.discord-status-icon');
    if (!badge || !card) return;
    setTextIfChanged(username, username?.textContent || 'Hover for status');
    setTextIfChanged(activity, activity?.textContent || 'Discord presence');
    const elements = { avatar, username, activity, statusIcon };
    let latestData = null;
    let hideTimeout = null;

    async function fetchDiscordData() {
      const userId = getUserIdFromDom();
      if (!userId || userId === 'YOUR_DISCORD_USER_ID') {
        setTextIfChanged(username, 'No user ID set');
        setTextIfChanged(activity, 'Add your Discord ID to see status');
        return;
      }
      try {
        const res = await fetchWithTimeout(`https://api.lanyard.rest/v1/users/${userId}`);
        if (!res) throw new Error('No response');
        if (res.ok) {
          const payload = await res.json();
          if (payload?.success && payload?.data) {
            const dataString = JSON.stringify(payload.data);
            if (dataString !== latestData) {
              latestData = dataString;
              updateUI(elements, payload.data);
            }
            return;
          }
          setTextIfChanged(username, 'Data error');
          setTextIfChanged(activity, 'Could not parse Discord data');
        } else if (res.status === 404) {
          setTextIfChanged(username, 'User not found');
          setTextIfChanged(activity, 'Check Discord user ID');
        } else {
          setTextIfChanged(username, 'API error');
          setTextIfChanged(activity, `Status: ${res.status}`);
        }
      } catch (err) {
        setTextIfChanged(username, 'Connection error');
        setTextIfChanged(activity, 'Check console for details');
        console.error('Lanyard fetch error', err);
      }
    }

    badge.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const data = latestData ? JSON.parse(latestData) : null;
        const userId = data?.discord_user?.id;
        if (!userId) return;
        const url = `https://discord.com/users/${userId}`;
        await copyToClipboard(url);
        console.log('Discord profile URL copied:', url);
      } catch (e) {
        console.error('Copy failed', e);
      }
    });

    function showCard() { clearTimeout(hideTimeout); card.classList.add('visible'); }
    function hideCard() { hideTimeout = setTimeout(() => card.classList.remove('visible'), 100); }

    ['mouseenter', 'focus'].forEach(evt => badge.addEventListener(evt, showCard));
    ['mouseleave'].forEach(evt => badge.addEventListener(evt, hideCard));
    card.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    card.addEventListener('mouseleave', hideCard);
    badge.addEventListener('keydown', (e) => { if (e.key === 'Escape') { card.classList.remove('visible'); badge.blur(); } });

    fetchDiscordData();
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(fetchDiscordData, FETCH_INTERVAL_MS);

    window.addEventListener('beforeunload', () => { if (updateInterval) { clearInterval(updateInterval); updateInterval = null; } });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { initDiscordPresence };
  else window.initDiscordPresence = initDiscordPresence;
})();