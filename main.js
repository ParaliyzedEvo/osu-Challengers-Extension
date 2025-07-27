// ==UserScript==
// @name         osu! O!c Mode Injector
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Toggle between default stats and O!c Mode custom panel. By Paraliyzed_evo and Thunderbirdo
// @match        https://osu.ppy.sh/users/*
// @match        https://osu.ppy.sh/u/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';
  console.log('[OTC] 🔥 v2.0.0 start');

  const osuId = parseInt(location.pathname.split('/')[2], 10);
  if (!osuId) return;
  console.log('[OTC] osuId =', osuId);

  // Config
  const SUPABASE_URL = 'https://yqgqoxgykswytoswqpkj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3FveGd5a3N3eXRvc3dxcGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTkxNTEsImV4cCI6MjA2NDI5NTE1MX0.cIWfvz9dlSWwYy7QKSmWpEHc1KVzpB77VzB7TNhQ2ec';
  const TOGGLE_ON_IMG = 'https://up.heyuri.net/src/4597.png';
  const TOGGLE_OFF_IMG = 'https://up.heyuri.net/src/4595.png';
  const RULES_IMG = 'https://up.heyuri.net/src/4600.png';
  const RULES_HOVER_IMG = 'https://up.heyuri.net/src/4599.png';

  const BADGE_CONFIG = [
    { ids: [19637339, 22228239, 32657919], classMod: 'dev', title: 'Developers', src: 'https://paraliyzed.net/img/dev.webp' },
    { ids: [15657407, 31708435], classMod: 'gfx', title: 'Effects Designer', src: 'https://paraliyzed.net/img/gfx.webp' },
    { ids: [24071806], classMod: 'pl', title: 'Project Lead', src: 'https://paraliyzed.net/img/lead.webp' },
    { ids: [19637339, 15657407], classMod: 'Strat', title: 'Strategist', src: 'https://paraliyzed.net/img/strat.webp' },
    { ids: [14540907, 17274052, 32657919, 16863950], classMod: 'qa', title: 'QA Tester', src: 'https://paraliyzed.net/img/qa.webp' },
    { ids: [4966334, 12577911], classMod: 'mapper', title: 'Mapper', src: 'https://paraliyzed.net/img/mapper.webp' },
    { ids: [15118952, 4125185, 29139453, 5052899], classMod: 'artist', title: 'Song Artist', src: 'https://paraliyzed.net/img/artist.webp' },
  ];

  // Global styles
  const styles = [
  `
    .oc-panel, .oc-panel__entry { display: none!important; }
    .profile-detail__stats.oc-mode .profile-detail__chart-numbers--top svg,
    .profile-detail__stats.oc-mode .profile-detail__chart-numbers--bottom,
    .profile-detail__stats.oc-mode dl.profile-stats__entry:not(.oc-panel__entry) {
      display: none!important;
    }
    .profile-detail__stats.oc-mode .oc-panel,
    .profile-detail__stats.oc-mode .oc-panel__entry {
      display: block!important;
    }
    `,
    `
    .oc-panel__entry {
      display: flex!important;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }
    .oc-panel__entry dt, .oc-panel__entry dd {
      margin: 0;
      padding: 0;
      white-space: nowrap;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
    }
    .oc-panel__entry dt { font-weight: 600; min-width: 120px; }
    .oc-panel__entry dd { text-align: right; }
    `,
    `
    .profile-detail__stats { position: relative; transition: opacity 150ms ease-in-out; }
    .oc-rules-btn {
      display: none; position: absolute; top: -1.1rem; right: 1rem; z-index: 10;
    }
    .profile-detail__stats.oc-mode .oc-rules-btn {
      display: block!important;
    }
    .profile-detail__stats.oc-mode .profile-stats {
      padding-top: 6rem!important;
    }
    .oc-rules-btn img {
      height: 32px; cursor: pointer;
    }
    `,
    `
    #otc-toggle-img {
      transition: opacity 150ms ease-in-out;
    }
    #otc-toggle-btn:hover #otc-toggle-img {
      transform: scale(1.1);
    }
    `
  ];
  styles.forEach(css => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  });

  // Inject badge
  function createBadge({ classMod, title, src }) {
  const link = document.createElement('a');
  link.href = 'https://paraliyzed.net';
  link.style.cssText = 'height:31px;width:auto;display:inline-block;position:relative;';

  const img = document.createElement('img');
  img.alt = title;
  img.src = src;
  img.style.cssText = 'height:31px;width:auto;';
  img.setAttribute('data-orig-title', title);
  img.setAttribute('data-hasqtip', '1');
  img.setAttribute('aria-describedby', 'qtip-1');

  link.appendChild(img);
  return link;
  }

  function injectBadge(labelClass, badgeEl) {
  const observer = new MutationObserver((_, obs) => {
    const nameHeader = document.querySelector('.profile-info__info .profile-info__name');
    if (nameHeader) {
      const existingBadges = nameHeader.querySelectorAll('a[href="https://paraliyzed.net"]');
      const offset = 7 + (existingBadges.length * 23);

      // Apply transform to the anchor, not the image
      badgeEl.style.transform = `translate(-${offset}px, 2px)`;

      nameHeader.appendChild(badgeEl);
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  }

  // Username styling per user
  function injectUsernameStyle(userId, styleFn, delay = 1500) {
  setTimeout(() => {
    const observer = new MutationObserver((_, obs) => {
      const nameContainer = document.querySelector('.profile-info__info .profile-info__name');
      if (!nameContainer) return;

      const spans = nameContainer.querySelectorAll('span.u-ellipsis-pre-overflow');

      for (const span of spans) {
        if (span.id === 'inspector_user_tag' || span.dataset.customApplied) continue;

        styleFn(span);
        span.dataset.customApplied = 'true';
        break;
      }

      obs.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }, delay);
  }

  if (osuId === 19637339)
    injectUsernameStyle(osuId, span => Object.assign(span.style, {
      background: 'linear-gradient(to right, #0000ff 45%, #7b00ff 55%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 'bold',
    }));

  if (osuId === 16863950)
    injectUsernameStyle(osuId, span => Object.assign(span.style, {
      background: 'linear-gradient(to right, #ff00ff 45%, #7b00ff 55%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 'bold',
    }));

  if (osuId === 14540907)
    injectUsernameStyle(osuId, span => {
      span.style.color = 'red';
      span.style.fontWeight = 'bold';
    });

  // Helpers
  async function callRpc(name, params) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.error(`[OTC] ❌ RPC ${name} failed`, res.status, await res.text());
      return null;
    }
    return await res.json();
  }

  function injectNoProfileMessage() {
    const titleRow = document.querySelector('.header-v4__row--title');
    const titleDiv = titleRow?.querySelector('.header-v4__title');
    if (!titleDiv || titleDiv.querySelector('.oc-no-profile-message')) return;

    const span = document.createElement('span');
    span.className = 'oc-no-profile-message';
    span.style.cssText = 'margin-top:7px;margin-left:5px;font-size:12px;color:gray;';
    span.textContent = 'No osu!Challengers profile found.';
    titleDiv.appendChild(span);
  }

  // Fetch data
  const SEASON_ID = await callRpc('get_current_season_id', {});
  const rawInt = await callRpc('get_user_id_from_osu_id', { p_osu_id: osuId });
  const internalId = typeof rawInt === 'number'
    ? rawInt
    : Array.isArray(rawInt)
      ? rawInt.find(v => typeof v === 'number')
      : rawInt && typeof rawInt === 'object'
        ? Object.values(rawInt).find(v => typeof v === 'number')
        : null;

  for (const cfg of BADGE_CONFIG) {
    if (cfg.ids.includes(osuId)) injectBadge(cfg.classMod, createBadge(cfg));
  }

  if (!internalId) {
    setTimeout(injectNoProfileMessage, 1000);
    return;
  }

  const board = await callRpc('get_season_leaderboard_with_user', {
    user_id_param: internalId,
    season_id_param: SEASON_ID,
  });

  const me = board?.find(r => r.is_target_user) || {
    position: 0,
    challenges_participated: 0,
    average_accuracy: 0,
    percentile: 0,
  };
  const statsData = await callRpc('get_user_stats', { p_user_id: internalId });
  const comp = Array.isArray(statsData) ? statsData[0] || {} : {};

  // Panel
  function buildCustomPanel() {
    const statsContainer = document.querySelector('.profile-stats');
    if (!statsContainer || statsContainer.querySelector('.oc-panel')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'oc-panel';
    const template = statsContainer.querySelector('dl.profile-stats__entry');
    if (!template) return;

    const fmtNum = v => typeof v === 'number' ? v.toLocaleString() : v;
    const fmtPct = v => typeof v === 'number' ? v.toFixed(2) + '%' : null;

    const entries = [
      ['ranked_score', 'Ranked Score', fmtNum(comp.ranked_score)],
      ['hit_accuracy', 'Hit Accuracy', fmtPct(comp.hit_accuracy)],
      ['play_count', 'Play Count', fmtNum(comp.play_count)],
      ['total_score', 'Total Score', fmtNum(comp.total_score)],
      ['total_hits', 'Total Hits', fmtNum(comp.total_hits)],
      ['hits_per_play', 'Hits Per Play', fmtNum(comp.hits_per_play)],
      ['maximum_combo', 'Maximum Combo', fmtNum(comp.maximum_combo)],
      ['replays_watched', 'Replays Watched', fmtNum(comp.replays_watched_by_others)],
      ['otc_rank', 'Challenger Rank: ', `#${me.position}`],
      ['challenges', 'Participation: ', me.challenges_participated],
      ['avg_accuracy', 'Avg Accuracy: ', fmtPct(me.average_accuracy)],
      ['percentile', 'Percentile: ', fmtPct(me.percentile)],
    ];

    entries.forEach(([key, label, val]) => {
      if (val == null) return;
      const dl = template.cloneNode(true);
      dl.className = `profile-stats__entry profile-stats__entry--key-${key} oc-panel__entry`;
      dl.querySelector('dt').textContent = label;
      dl.querySelector('dd').textContent = val;
      wrapper.appendChild(dl);
    });

    statsContainer.appendChild(wrapper);
  }

  function toggleOCMode() {
    const statsRoot = document.querySelector('.profile-detail__stats');
    if (!statsRoot) return;
    statsRoot.style.opacity = 0;
    setTimeout(() => {
      const on = statsRoot.classList.toggle('oc-mode');
      document.documentElement.classList.toggle('oc-ui', on);
      const img = document.getElementById('otc-toggle-img');
      if (img) {
        img.style.opacity = 0;
        setTimeout(() => {
          img.src = on ? TOGGLE_ON_IMG : TOGGLE_OFF_IMG;
          img.style.opacity = 1;
        }, 150);
      }
      statsRoot.style.opacity = 1;
    }, 150);
  }

  function injectToggleButton() {
    const titleRow = document.querySelector('.header-v4__row--title');
    if (!titleRow || document.getElementById('otc-toggle-btn')) return false;

    const btn = document.createElement('button');
    btn.id = 'otc-toggle-btn';
    btn.style.cssText = 'border:none;background:none;padding:0;margin-left:auto;cursor:pointer;';

    const img = document.createElement('img');
    img.id = 'otc-toggle-img';
    img.src = TOGGLE_OFF_IMG;
    img.style.cssText = 'width:32px;height:32px;';

    btn.appendChild(img);
    btn.addEventListener('click', toggleOCMode);
    titleRow.appendChild(btn);
    return true;
  }

  function injectRulesButton() {
    if (document.querySelector('.oc-rules-btn')) return;
    const link = document.createElement('a');
    link.className = 'oc-rules-btn';
    link.href = `https://osu-challenge-tracker.vercel.app/profile/${internalId}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const img = document.createElement('img');
    img.src = RULES_IMG;
    img.alt = 'O!c Rules';
    img.style.cssText = 'height:75px;width:auto;transition:opacity 200ms,transform 100ms;';

    img.addEventListener('mouseenter', () => {
      img.src = RULES_HOVER_IMG;
      img.style.transform = 'scale(1.1)';
    });
    img.addEventListener('mouseleave', () => {
      img.src = RULES_IMG;
      img.style.transform = 'scale(1)';
    });

    link.appendChild(img);
    const statsRoot = document.querySelector('.profile-detail__stats');
    if (statsRoot) statsRoot.prepend(link);
  }

  // Inject UI
  buildCustomPanel();
  injectRulesButton();

  if (!injectToggleButton()) {
    new MutationObserver((_, o) => {
      if (injectToggleButton()) o.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
