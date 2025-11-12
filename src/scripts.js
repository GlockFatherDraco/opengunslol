(function () {
  'use strict';

  // UTILITIES
  const $ = (s) => document.querySelector(s);
  const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const setSrc = (img, src) => { if (img && img.src !== src) img.src = src; };

  // CONFIG
  const CONFIG = {
    FETCH_INTERVAL_MS: 30000,
    FETCH_TIMEOUT_MS: 7000,
    LANYARD_API: (id) => `https://api.lanyard.rest/v1/users/${id}`,
    DEFAULT_USER_ID_PLACEHOLDER: 'YOUR_DISCORD_USER_ID',
    DEFAULT_AVATAR_SIZE: 128,
    TEXT: {
      NO_USER_ID_SET: 'No user ID set',
      ADD_DISCORD_ID: 'Add a Discord ID to enable presence',
      OFFLINE: 'Offline',
      NO_ACTIVE_ACTIVITY: 'currently doing nothing',
      DATA_ERROR_TITLE: 'Data error',
      DATA_ERROR_ACTIVITY: 'Unexpected payload',
      USER_NOT_FOUND: 'User not found',
      CHECK_USER_ID: 'Check Discord user ID',
      API_ERROR_TITLE: 'API error',
      CONNECTION_ERROR_TITLE: 'Connection error',
      CONNECTION_ERROR_ACTIVITY: 'See console for details',
      COPY_FAILED_LOG: 'Copy failed'
    },
    SELECTORS: {
      META_USER_ID: 'meta[name="discord-user-id"]',
      BADGE: '.discord-presence-badge',
      CARD: '.discord-presence-card',
      AVATAR: '.discord-avatar',
      USERNAME: '.discord-username',
      ACTIVITY: '.discord-activity',
      STATUS_ICON: '.discord-status-icon'
    },
    HIDE_DELAY_MS: 100
  };

  // --- COMPONENTS ---

  // DISCORD PRESENCE
  const DiscordPresence = (function () {
    'use strict';

    let updateInterval = null;

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
        console.error(CONFIG.TEXT.COPY_FAILED_LOG, err);
        return false;
      }
    }

    async function fetchWithTimeout(url, timeout = CONFIG.FETCH_TIMEOUT_MS) {
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
      if (status === 'offline') return CONFIG.TEXT.OFFLINE;
      if (data.listening_to_spotify && data.spotify) {
        const s = data.spotify;
        return `Listening to ${s.song} by ${s.artist}`;
      }
      const activities = Array.isArray(data.activities) ? data.activities : [];
      if (!activities.length) return CONFIG.TEXT.NO_ACTIVE_ACTIVITY;
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
      return (custom && (custom.state || custom.name)) || CONFIG.TEXT.NO_ACTIVE_ACTIVITY;
    }

    function updateUI(elements, data) {
      if (!data) return;
      const user = data.discord_user || {};
      if (elements.avatar) {
        const isAnimated = typeof user.avatar === 'string' && user.avatar.startsWith('a_');
        const ext = isAnimated ? 'gif' : 'png';
        const avatarUrl = user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${CONFIG.DEFAULT_AVATAR_SIZE}`
          : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;
        setSrc(elements.avatar, avatarUrl);
        setAttr(elements.avatar, 'alt', `${user.username || 'User'} avatar`);
      }
      if (elements.username) {
        const display = user.username || 'Unknown user';
        setText(elements.username, display);
      }
      if (elements.statusIcon) {
        const apiStatus = data.discord_status || 'offline';
        elements.statusIcon.className = `discord-status-icon ${apiStatus === 'offline' ? 'invisible' : apiStatus}`;
      }
      if (elements.activity) setText(elements.activity, activityText(data));
    }

    function getUserIdFromDom() {
      return $(CONFIG.SELECTORS.META_USER_ID)?.content
        || $(CONFIG.SELECTORS.BADGE)?.dataset.userId
        || null;
    }

    function init() {
      const badge = $(CONFIG.SELECTORS.BADGE);
      const card = $(CONFIG.SELECTORS.CARD);
      if (!badge || !card) return;

      if (!badge.hasAttribute('tabindex')) badge.setAttribute('tabindex', '0');

      const elements = {
        avatar: $(CONFIG.SELECTORS.AVATAR),
        username: $(CONFIG.SELECTORS.USERNAME),
        activity: $(CONFIG.SELECTORS.ACTIVITY),
        statusIcon: $(CONFIG.SELECTORS.STATUS_ICON)
      };

      let lastPayloadJson = null;
      let hideTimer = null;

      const showCard = () => { clearTimeout(hideTimer); card.classList.add('visible'); };
      const hideCard = () => { hideTimer = setTimeout(() => card.classList.remove('visible'), CONFIG.HIDE_DELAY_MS); };

      async function fetchDiscordData() {
        const userId = getUserIdFromDom();
        if (!userId || userId === CONFIG.DEFAULT_USER_ID_PLACEHOLDER) {
          setText(elements.username, CONFIG.TEXT.NO_USER_ID_SET);
          setText(elements.activity, CONFIG.TEXT.ADD_DISCORD_ID);
          return;
        }
        try {
          const res = await fetchWithTimeout(CONFIG.LANYARD_API(userId));
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
            setText(elements.username, CONFIG.TEXT.DATA_ERROR_TITLE);
            setText(elements.activity, CONFIG.TEXT.DATA_ERROR_ACTIVITY);
            return;
          }
          if (res.status === 404) {
            setText(elements.username, CONFIG.TEXT.USER_NOT_FOUND);
            setText(elements.activity, CONFIG.TEXT.CHECK_USER_ID);
          } else {
            setText(elements.username, CONFIG.TEXT.API_ERROR_TITLE);
            setText(elements.activity, `Status: ${res.status}`);
          }
        } catch (err) {
          setText(elements.username, CONFIG.TEXT.CONNECTION_ERROR_TITLE);
          setText(elements.activity, CONFIG.TEXT.CONNECTION_ERROR_ACTIVITY);
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
          console.error(CONFIG.TEXT.COPY_FAILED_LOG, err);
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
      updateInterval = setInterval(fetchDiscordData, CONFIG.FETCH_INTERVAL_MS);

      window.addEventListener('beforeunload', () => {
        if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
      });
    }

    return { init };
  })();

  // MUSIC PLAYER
  const MusicPlayer = (function () {
    let globalAudio;

    function init() {
      const player = document.querySelector('.music-player');
      if (!player) return;

      const audio = new Audio();
      globalAudio = audio;

      const playBtn = player.querySelector('.play-pause');
      const prevBtn = player.querySelector('.prev-track');
      const nextBtn = player.querySelector('.next-track');
      const trackName = player.querySelector('.music-track-name');
      const cover = player.querySelector('.music-cover');
      const currentTimeEl = player.querySelector('.current-time');
      const durationEl = player.querySelector('.duration-time');
      const seekbar = player.querySelector('.music-seekbar');
      const progress = player.querySelector('.music-seekbar-progress');

      const icons = {
        play: 'src/assets/icons/music/music-player/play.svg',
        pause: 'src/assets/icons/music/music-player/pause.svg',
        next: 'src/assets/icons/music/music-player/next.svg',
        prev: 'src/assets/icons/music/music-player/previous.svg'
      };

      const tracks = [
        { name: 'The World Looks White', file: 'src/assets/music/tracks/The_World_Looks_White.opus', cover: 'src/assets/music/covers/violence.png' },
        { name: 'The World Looks Red', file: 'src/assets/music/tracks/The_World_Looks_Red.opus', cover: 'src/assets/music/covers/violence.png' }
      ];

      let index = 0;
      let playing = false;
      let dragging = false;
      const autoPlay = true;

      const setIcon = (btn, src, alt = '') => btn && (btn.innerHTML = `<img src="${src}" alt="${alt}">`);

      const loadTrack = i => {
        const t = tracks[i];
        audio.src = t.file;
        trackName.textContent = t.name;
        cover.src = t.cover;
        cover.alt = t.name;
      };

      const togglePlay = () => {
        if (audio.paused) {
          audio.play(); playing = true; setIcon(playBtn, icons.pause, 'Pause');
        } else {
          audio.pause(); playing = false; setIcon(playBtn, icons.play, 'Play');
        }
      };

      const nextTrack = () => {
        index = (index + 1) % tracks.length;
        loadTrack(index);
        if (playing) audio.play();
      };

      const prevTrack = () => {
        index = (index - 1 + tracks.length) % tracks.length;
        loadTrack(index);
        if (playing) audio.play();
      };

      const formatTime = s => {
        if (isNaN(s)) return '0:00';
        const m = Math.floor(s / 60), sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
      };

      const updateProgress = () => {
        if (!dragging && audio.duration) {
          const pct = (audio.currentTime / audio.duration) * 100 || 0;
          progress.style.width = pct + '%';
          currentTimeEl.textContent = formatTime(audio.currentTime);
          durationEl.textContent = formatTime(audio.duration);
        }
      };

      const seek = e => {
        if (!audio.duration) return;
        const rect = seekbar.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
        audio.currentTime = (pct / 100) * audio.duration;
        progress.style.width = pct + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);
      };

      seekbar.addEventListener('click', seek);
      seekbar.addEventListener('mousedown', e => { dragging = true; seek(e); });
      document.addEventListener('mousemove', e => dragging && seek(e));
      document.addEventListener('mouseup', () => dragging = false);
      seekbar.addEventListener('touchstart', e => { dragging = true; seek(e); e.preventDefault(); });
      document.addEventListener('touchmove', e => dragging && (seek(e), e.preventDefault()));
      document.addEventListener('touchend', () => dragging = false);

      setIcon(playBtn, icons.play, 'Play');
      setIcon(nextBtn, icons.next, 'Next');
      setIcon(prevBtn, icons.prev, 'Previous');

      playBtn.addEventListener('click', togglePlay);
      nextBtn.addEventListener('click', nextTrack);
      prevBtn.addEventListener('click', prevTrack);
      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('loadedmetadata', updateProgress);
      audio.addEventListener('ended', nextTrack);

      loadTrack(index);

      if (autoPlay) {
        let started = false;
        const tryPlay = () => {
          if (started) return;
          started = true;
          audio.play().then(() => { playing = true; setIcon(playBtn, icons.pause, 'Pause'); }).catch(() => { });
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('keydown', tryPlay);
        };
        audio.play().catch(() => {
          document.addEventListener('click', tryPlay, { once: true });
          document.addEventListener('keydown', tryPlay, { once: true });
        });
      }
    }

    function getAudio() {
      return globalAudio;
    }

    return { init, getAudio };
  })();

  // VOLUME CONTROL
  const VolumeControl = (function () {
    function init() {
      const btn = document.querySelector('.volume-button');
      const slider = document.querySelector('.volume-slider');
      const wrapper = document.querySelector('.volume-slider-wrapper');
      if (!btn || !slider || !wrapper) return;

      let muted = false;
      let prevVol = 1;

      const getAudioEl = () => typeof MusicPlayer.getAudio !== 'undefined' ? MusicPlayer.getAudio() : null;

      const setIcon = () => {
        const src = muted ? 'src/assets/icons/music/volume-control/muted.svg' : 'src/assets/icons/music/volume-control/volume.svg';
        const alt = muted ? 'Muted' : 'Volume';
        btn.innerHTML = `<img src="${src}" alt="${alt}" style="width:100%;height:100%;object-fit:contain;">`;
      };

      const setVolume = v => {
        const audio = getAudioEl();
        if (!audio) return;
        audio.volume = v;
        slider.value = v * 100;
        wrapper.style.setProperty('--volume-percent', v * 100 + '%');
      };

      const toggleMute = () => {
        const audio = getAudioEl();
        if (!audio) return;
        muted ? setVolume(prevVol) : (prevVol = audio.volume, setVolume(0));
        muted = !muted;
        setIcon();
      };

      const updateVolume = e => {
        const v = e.target.value / 100;
        const audio = getAudioEl();
        if (!audio) return;
        audio.volume = v;
        wrapper.style.setProperty('--volume-percent', e.target.value + '%');
        if (v === 0) muted = true;
        else if (muted) { muted = false; prevVol = v; }
        setIcon();
      };

      const handleClick = e => {
        const rect = slider.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        slider.value = pct;
        updateVolume({ target: slider });
      };

      btn.addEventListener('dblclick', e => { e.preventDefault(); toggleMute(); });
      slider.addEventListener('input', updateVolume);
      slider.addEventListener('change', updateVolume);
      slider.addEventListener('click', handleClick);

      setTimeout(() => { setVolume(1); setIcon(); }, 100);
    }

    return { init };
  })();

  // --- EFFECTS ---

  // RIPPLE
  const Ripple = (function () {
    function create(e) {
      const r = document.createElement('span');
      r.className = 'ripple-effect';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }

    function init() {
      document.body.addEventListener('click', create);
    }

    return { init, create };
  })();

  // ANIMATIONS
  const Animations = (function () {
    function initCardAnimation() {
      const card = document.querySelector('.card');
      const musicPlayer = document.querySelector('.music-player');
      const volumeButton = document.querySelector('.volume-control-wrapper');
      const discordBadge = document.querySelector('.discord-presence-badge');
      const easing = 'cubic-bezier(0.34,1.56,0.64,1)';
      const dur = '0.8s';
      const baseDelay = 5;

      const setInitial = (el, transform) => {
        if (!el) return;
        el.style.transition = 'none';
        el.style.transform = transform;
        el.style.opacity = '0';
      };

      const animate = (el, transform, delay = 0) => {
        if (!el) return;
        setTimeout(() => {
          el.style.transition = `transform ${dur} ${easing}, opacity ${dur} ${easing}`;
          el.style.transform = transform;
          el.style.opacity = '1';
        }, delay);
      };

      setInitial(card, 'translateY(-50px)');
      setInitial(musicPlayer, 'translateY(50px)');
      setInitial(volumeButton, 'translateX(-50px)');
      setInitial(discordBadge, 'translateX(50px)');

      animate(card, 'translateY(0)', baseDelay);
      animate(musicPlayer, 'translateY(0)', baseDelay + 75);
      animate(volumeButton, 'translateX(0)', baseDelay + 150);
      animate(discordBadge, 'translateX(0)', baseDelay + 150);
    }

    return { initCardAnimation };
  })();

  // BACKGROUND EFFECTS
  const BackgroundEffects = (function () {
    function init() {
      const sheets = Array.from(document.styleSheets);
      let effect = 'default';

      for (const sheet of sheets) {
        try {
          if (!sheet.href || !sheet.href.includes('effects/background/')) continue;
          const name = sheet.href.split('/').pop();
          if (name.includes('rain.css')) effect = 'rain';
          else if (name.includes('snow.css')) effect = 'snow';
          else if (name.includes('stars.css')) effect = 'stars';
          else if (name.includes('particles.css')) effect = 'particles';
          else if (name.includes('oldtv.css')) effect = 'oldtv';
          else if (name.includes('crt.css')) effect = 'crt';
          else if (name.includes('storm.css')) effect = 'storm';
          else if (name.includes('bloodrain.css')) effect = 'bloodrain';
          else if (name.includes('blur.css')) effect = 'blur';
        } catch { }
      }

      const containerFactory = (className, count = 0, inner = null) => {
        const container = document.createElement('div');
        container.className = className;
        for (let i = 0; i < count; i++) {
          const el = document.createElement('div');
          if (inner) el.innerHTML = inner;
          el.className = className.includes('rain') ? 'rain-drop' :
            className.includes('snow') ? 'snowflake' :
              className.includes('stars') ? 'star' :
                className.includes('particles') ? 'particle' : '';
          container.appendChild(el);
        }
        return container;
      };

      const append = el => el && document.body.appendChild(el);

      switch (effect) {
        case 'rain':
        case 'bloodrain':
          append(containerFactory('rain-effect', 30));
          break;
        case 'snow':
          const snow = containerFactory('snow-effect', 20, '❄');
          append(snow);
          break;
        case 'stars':
          append(containerFactory('stars-effect', 30));
          break;
        case 'particles':
          append(containerFactory('particles-effect', 20));
          break;
        case 'oldtv':
          const oldtv = document.createElement('div');
          oldtv.className = 'oldtv-effect';
          oldtv.appendChild(document.createElement('div')).className = 'oldtv-flicker';
          oldtv.appendChild(document.createElement('div')).className = 'oldtv-static';
          append(oldtv);
          break;
        case 'crt':
          const crt = document.createElement('div');
          crt.className = 'crt-effect';
          ['crt-rgb', 'crt-glow', 'crt-flicker', 'crt-roll'].forEach(c => {
            const d = document.createElement('div');
            d.className = c;
            crt.appendChild(d);
          });
          append(crt);
          break;
        case 'storm':
          const storm = containerFactory('rain-effect', 30);
          const lightning = document.createElement('div');
          lightning.className = 'lightning-flash';
          storm.appendChild(lightning);
          for (let i = 0; i < 3; i++) {
            const bolt = document.createElement('div');
            bolt.className = 'lightning-bolt';
            storm.appendChild(bolt);
          }
          append(storm);
          break;
        case 'blur':
        default: break;
      }
    }
    return { init };
  })();

  // TITLE ANIMATION
  const TitleAnimation = (function () {
    function init() {
      const prefix = '@';
      const fullText = document.title.replace(prefix, '');
      let i = 0;
      let typing = true;
      const speed = 500;
      const pause = 3000;

      const step = () => {
        document.title = prefix + fullText.substring(0, i);
        if (typing) {
          i++;
          if (i > fullText.length) return setTimeout(() => { typing = false; i = fullText.length; step(); }, pause);
        } else {
          i--;
          if (i === 0) return setTimeout(() => { typing = true; step(); }, pause);
        }
        setTimeout(step, speed);
      };

      step();
    }
    return { init };
  })();

  // CURSOR
  const Cursor = (function () {
    class CustomCursor {
      constructor() {
        if (document.querySelector('.custom-cursor')) return;
        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        this.tx = 0;
        this.ty = 0;
        this.raf = null;
        this.init();
      }

      init() {
        document.body.appendChild(this.cursor);
        this.loadCursorImage();
        this.addEventListeners();
        this.show(); // Show the cursor initially
        this.render(); // Initial render
      }

      loadCursorImage() {
        const meta = document.querySelector('meta[name="cursor-image"]')?.getAttribute('content');
        const bodyAttr = document.body.getAttribute('data-cursor-image');
        this.updateCursorImage(meta || bodyAttr || null);
      }

      updateCursorImage(url) {
        if (!url) return;
        document.documentElement.style.setProperty('--cursor-image', `url("${url}")`);
        this.cursor.style.backgroundImage = `url("${url}")`;
      }

      render() {
        this.cursor.style.transform = `translate(${this.tx}px, ${this.ty}px) translate(-50%, -50%)`;
        this.raf = null;
      }

      onMove(e) {
        this.tx = e.clientX;
        this.ty = e.clientY;
        if (!this.raf) {
          this.raf = requestAnimationFrame(() => this.render());
        }
      }

      show() {
        this.cursor.style.opacity = '1';
      }

      hide() {
        this.cursor.style.opacity = '0';
      }

      addEventListeners() {
        document.addEventListener('mousemove', (e) => this.onMove(e), { passive: true });
        document.addEventListener('touchmove', (e) => {
          const t = e.touches?.[0];
          if (t) this.onMove(t);
        }, { passive: true });

        document.addEventListener('mouseenter', () => this.show(), { passive: true });
        document.addEventListener('mouseleave', () => this.hide(), { passive: true });
        document.addEventListener('mouseover', () => this.show(), { passive: true });
        window.addEventListener('focus', () => this.show());
        window.addEventListener('blur', () => this.hide());
      }
    }

    function init() {
      new CustomCursor();
    }

    return { init };
  })();

  // --- CORE ---

  // ENTRY SEQUENCE
  const EntrySequence = (function () {
    function init() {
      const overlay = document.querySelector('.entry-overlay');
      if (!overlay) return;

      document.body.classList.add('entry-active');
      let dismissed = false;

      const hide = () => {
        if (dismissed) return;
        dismissed = true;
        overlay.classList.add('hidden');
        document.body.classList.remove('entry-active');

        setTimeout(() => typeof Animations.initCardAnimation === 'function' && Animations.initCardAnimation(), 50);
        setTimeout(() => overlay.remove(), parseFloat(getComputedStyle(overlay).transitionDuration) * 1000);
      };

      overlay.addEventListener('click', e => {
        if (dismissed) return;
        Ripple.create(e);
        setTimeout(hide, 200);
      });

      const keyHandler = e => {
        if (!overlay.classList.contains('hidden')) hide();
        document.removeEventListener('keydown', keyHandler);
      };
      document.addEventListener('keydown', keyHandler);
    }
    return { init };
  })();

  // MAIN
  document.addEventListener('DOMContentLoaded', () => {
    // Initially hide elements that will be animated
    const card = document.querySelector('.card');
    const musicPlayer = document.querySelector('.music-player');
    const volumeButton = document.querySelector('.volume-control-wrapper');

    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-50px)';
      card.style.transition = 'none';
    }

    if (musicPlayer) {
      musicPlayer.style.opacity = '0';
      musicPlayer.style.transform = 'translateY(50px)';
      musicPlayer.style.transition = 'none';
    }

    if (volumeButton) {
      volumeButton.style.opacity = '0';
      volumeButton.style.transform = 'translateX(-50px)';
      volumeButton.style.transition = 'none';
    }

    EntrySequence.init();
    Ripple.init();
    BackgroundEffects.init();
    MusicPlayer.init();
    VolumeControl.init();
    DiscordPresence.init();
    TitleAnimation.init();
    Cursor.init();
  });

  // EXPORTS (for testing or other modules)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DiscordPresence,
      MusicPlayer,
      VolumeControl,
      Ripple,
      Animations,
      BackgroundEffects,
      TitleAnimation,
      Cursor,
      EntrySequence
    };
  }
})();
