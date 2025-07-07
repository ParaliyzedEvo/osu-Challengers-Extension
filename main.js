// ==UserScript==
// @name         osu! O!c Mode Injector
// @namespace    http://tampermonkey.net/
// @version      1.9.1
// @description  Toggle between default stats and O!c Mode custom panel 🎉
// @match        https://osu.ppy.sh/users/*
// @match        https://osu.ppy.sh/u/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(async function() {
  'use strict';
  console.log('[OTC] 🔥 v1.9.1 start');

  // ── CONFIG ──
  const SUPABASE_URL      = 'https://yqgqoxgykswytoswqpkj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3FveGd5a3N3eXRvc3dxcGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTkxNTEsImV4cCI6MjA2NDI5NTE1MX0.cIWfvz9dlSWwYy7QKSmWpEHc1KVzpB77VzB7TNhQ2ec';
  const SEASON_ID         = 1;

  const TOGGLE_ON_IMG  = 'https://up.heyuri.net/src/4597.png';
  const TOGGLE_OFF_IMG = 'https://up.heyuri.net/src/4595.png';
  const RULES_IMG       = 'https://up.heyuri.net/src/4600.png';
  const RULES_HOVER_IMG = 'https://up.heyuri.net/src/4599.png';


  const RPC_GET_INTERNAL      = 'get_user_id_from_osu_id';
  const RPC_GET_INTERNAL_KEY  = 'p_osu_id';
  const RPC_SEASON_FUNC       = 'get_season_leaderboard_with_user';
  const RPC_SEASON_USER_KEY   = 'user_id_param';
  const RPC_SEASON_SEASON_KEY = 'season_id_param';

  // ── SELECTORS ──
  const STATS_WRAPPER_SEL   = '.profile-detail__stats';
  const TOP_NUMBERS_SEL     = '.profile-detail__chart-numbers--top';
  const BOTTOM_GRAPH_SEL    = '.profile-detail__chart-numbers--bottom';
  const VALUES_SEL          = '.profile-detail__values';
  const RANK_CARD_SEL       = '.value-display--rank';
  const TOGGLE_BUTTON_SEL   = '.profile-detail__cover .osu-layout-button[value="osu"]';

    let _imgClones = [];

    const ocStyle = document.createElement('style');
    ocStyle.textContent = `
  /* 1) Always hide our custom panel and entries by default */
  .oc-panel { display: none!important; }
  .oc-panel__entry { display: none!important; }

  /* 2) When .oc-mode is on the stats wrapper… */
  .profile-detail__stats.oc-mode {

    /*   a) hide the graphs   */
    --ignored: none; /* hack to start the block */
  }
  .profile-detail__stats.oc-mode .profile-detail__chart-numbers--top svg,
  .profile-detail__stats.oc-mode .profile-detail__chart-numbers--bottom {
    display: none!important;
  }

  /*   b) hide every built-in <dl> entry   */
  .profile-detail__stats.oc-mode dl.profile-stats__entry:not(.oc-panel__entry) {
    display: none!important;
  }

  /*   c) show our wrapper and entries   */
  .profile-detail__stats.oc-mode .oc-panel {
    display: block!important;
  }
  .profile-detail__stats.oc-mode .oc-panel__entry {
    display: flex!important;
  }
`;
    document.head.appendChild(ocStyle);

    const alignStyle = document.createElement('style');
    alignStyle.textContent = `
  /* make every custom entry a flex row with space-between */
  .oc-panel__entry {
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
  }

  .oc-panel__entry dt,
  .oc-panel__entry dd {
    margin: 0;
    padding: 0;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .oc-panel__entry dt {
    font-weight: 600;
    min-width: 120px; /* or whatever width fits best */
  }

  .oc-panel__entry dd {
    text-align: right;
  }
`;
    document.head.appendChild(alignStyle);

    // ─── RULES BUTTON + EXTRA PUSH-DOWN ───
    const rulesStyle = document.createElement('style');
    rulesStyle.textContent = `
  .profile-detail__stats {
    position: relative;
  }
  .oc-rules-btn {
    display: none;
    position: absolute;
    top: -1.1rem;        /* move the button closer to the top edge */
    right: 1rem;
    z-index: 10;
  }
  .profile-detail__stats.oc-mode .oc-rules-btn {
    display: block !important;
  }

  /* bump this up until all your stats sit below the button */
  .profile-detail__stats.oc-mode .profile-stats {
    padding-top: 6rem !important;  /* ← try 6rem (96px) or tweak as needed */
  }
  .oc-rules-btn img {
    height: 32px;
    cursor: pointer;
  }
`;
    document.head.appendChild(rulesStyle);







    const toggleFx = document.createElement('style');
    toggleFx.textContent = `
  /* fade the icon in/out */
  #otc-toggle-img {
    transition: opacity 150ms ease-in-out;
    opacity: 1;
  }
  /* scale up slightly on hover */
  #otc-toggle-btn:hover #otc-toggle-img {
    transform: scale(1.1);
  }
`;
    document.head.appendChild(toggleFx);

    const statsFx = document.createElement('style');
    statsFx.textContent = `
  /* smooth opacity transition for the stats panel */
  .profile-detail__stats {
    transition: opacity 150ms ease-in-out;
  }
`;
    document.head.appendChild(statsFx);



    // ── 1) Generic REST-RPC caller ──
  async function callRpc(name, params) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.error(`[OTC] ❌ RPC ${name} failed`, res.status, await res.text());
      return null;
    }
    const data = await res.json();
    console.log(`[OTC] ✅ RPC ${name}`, data);
    return data;
  }

  // ── 2) Fetch our “me” row and seasonRank ──
const USE_MANUAL_ID = false;
const osuId = USE_MANUAL_ID ? 22228239 : parseInt(location.pathname.split('/')[2], 10);
  if (!osuId) return;
  console.log('[OTC] osuId =', osuId);

  // 2a) internal ID
  const rawInt = await callRpc(RPC_GET_INTERNAL, { [RPC_GET_INTERNAL_KEY]: osuId });
  const internalId = typeof rawInt === 'number'
    ? rawInt
    : Array.isArray(rawInt) && typeof rawInt[0] === 'number'
      ? rawInt[0]
      : (rawInt && typeof rawInt === 'object')
        ? Object.values(rawInt).find(v=>typeof v==='number')
        : null;
  if (!internalId) return console.error('[OTC] ❌ could not resolve internalId');
  console.log('[OTC] internalId =', internalId);

  // 2b) seasonal leaderboard
  const board = await callRpc(RPC_SEASON_FUNC, {
    [RPC_SEASON_USER_KEY]:     internalId,
    [RPC_SEASON_SEASON_KEY]:   SEASON_ID,
  });
  if (!Array.isArray(board)) return console.error('[OTC] ❌ bad leaderboard');
  let me = board.find(r => r.is_target_user);
  if (!me) {
    console.warn('[OTC] ⚠️ not on leaderboard — using defaults');
    me = {
      position: 0,
      challenges_participated: 0,
      average_accuracy: 0,
      percentile: 0,
    };
  }
const seasonRank = me.position;
  console.log('[OTC] seasonRank =', seasonRank);


    // ─── Fetch the full user‐stats RPC ───
    const statsData = await callRpc(
        'get_user_stats',            // the exact function name in your schema
        { p_user_id: internalId }    // note the param is "p_user_id" here
    );
    const comp = Array.isArray(statsData) ? statsData[0] || {} : {};
    console.log('[OTC] get_user_stats →', comp);





  // ── 3) Inject stylesheet for oc-mode hiding ──
  const style = document.createElement('style');
  style.textContent = `
    /* hide original stats when in .oc-mode */
    ${STATS_WRAPPER_SEL}.oc-mode > ${TOP_NUMBERS_SEL},
    ${STATS_WRAPPER_SEL}.oc-mode > ${BOTTOM_GRAPH_SEL} {
      display: none!important;
    }
    /* ensure our panel shows */
    ${STATS_WRAPPER_SEL}.oc-mode .otc-panel {
      display: flex!important;
    }
  `;
  document.head.appendChild(style);


    function buildCustomPanel() {
        const statsContainer = document.querySelector('.profile-stats');
        if (!statsContainer || statsContainer.querySelector('.oc-panel')) return;

        // 1) wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'oc-panel';

        // 2) real <dl> template for styling
        const template = statsContainer.querySelector('dl.profile-stats__entry');
        if (!template) return;

        // 3) format helpers
        const fmtNum = v => typeof v === 'number' ? v.toLocaleString() : v;
        const fmtPct = v => typeof v === 'number' ? v.toFixed(2)+'%' : null;

        // 4) build array of [key, label, value]
        const entries = [
            ['ranked_score',   'Ranked Score',      fmtNum(comp.ranked_score)],
            ['hit_accuracy',   'Hit Accuracy',      comp.hit_accuracy != null ? comp.hit_accuracy.toFixed(2)+'%' : null],
            ['play_count',     'Play Count',        fmtNum(comp.play_count)],
            ['total_score',    'Total Score',       fmtNum(comp.total_score)],
            ['total_hits',     'Total Hits',        fmtNum(comp.total_hits)],
            ['hits_per_play',  'Hits Per Play',     fmtNum(comp.hits_per_play)],
            ['maximum_combo',  'Maximum Combo',     fmtNum(comp.maximum_combo)],
            ['replays_watched','Replays Watched',   fmtNum(comp.replays_watched_by_others)],

            // your seasonal stats:
            ['otc_rank',       'Challenger Rank: ',          `#${seasonRank}`],
            ['challenges',     'Participation: ',        me.challenges_participated],
            ['avg_accuracy',   'Avg Accuracy: ',      fmtPct(me.average_accuracy)],
            ['percentile',     'Percentile: ',        fmtPct(me.percentile)],
        ];

        // 5) clone only the non‐null values
        for (const [key, label, val] of entries) {
            if (val == null) continue;
            const dl = template.cloneNode(true);
            dl.className = `profile-stats__entry profile-stats__entry--key-${key} oc-panel__entry`;
            dl.querySelector('dt').textContent = label;
            dl.querySelector('dd').textContent = val;
            wrapper.appendChild(dl);
        }

        // 6) append under the right‐hand stats container
        statsContainer.appendChild(wrapper);
    }
    buildCustomPanel();




    // 1) Remove both the global/country top container and the bottom graph
    // got rid of this sorry :<

    // 2) Locate the right‐hand stats panel (the one that contains "Ranked Score")
    //GONE

    function toggleOCMode() {
        const statsRoot = document.querySelector('.profile-detail__stats');
        if (!statsRoot) return;

        // 1) fade OUT
        statsRoot.style.opacity = 0;

        // 2) after the fade-out completes, swap classes & fade IN
        setTimeout(() => {
            const on = statsRoot.classList.toggle('oc-mode');
            document.documentElement.classList.toggle('oc-ui', on);

            // update the icon the same delayed way
            const img = document.getElementById('otc-toggle-img');
            if (img) {
                img.style.opacity = 0;
                setTimeout(() => {
                    img.src = on ? TOGGLE_ON_IMG : TOGGLE_OFF_IMG;
                    img.style.opacity = 1;
                }, 150);
            }

            // now fade the stats panel back in
            statsRoot.style.opacity = 1;
        }, 150);

    }







    function injectToggleButton() {
        const titleRow = document.querySelector('.header-v4__row--title');
        if (!titleRow || document.getElementById('otc-toggle-btn')) return false;

        // create the button
        const btn = document.createElement('button');
        btn.id = 'otc-toggle-btn';
        btn.style.cssText = `
    border: none; background: none; padding: 0;
    margin-left: auto; cursor: pointer;
  `;

        // create the img
        const img = document.createElement('img');
        img.id = 'otc-toggle-img';
        img.src = TOGGLE_OFF_IMG;     // start in the “off” state
        img.style.cssText = `
    width: 32px; height: 32px;
  `;

        btn.appendChild(img);
        btn.addEventListener('click', toggleOCMode);
        titleRow.appendChild(btn);
        return true;
    }


    function injectRulesButton() {
        if (document.querySelector('.oc-rules-btn')) return;

        const link = document.createElement('a');
        link.className = 'oc-rules-btn';
        link.href   = `https://osu-challenge-tracker.vercel.app/profile/${internalId}`;
        link.target = '_blank';
        link.rel    = 'noopener noreferrer';

        // 2) Create the <img> with the default src
        const img = document.createElement('img');
        img.src = RULES_IMG;
        img.alt = 'O!c Rules';
        img.style.height = '75px';
        img.style.width  = 'auto';
        img.style.transition = 'transform 100ms ease, opacity 100ms ease';

        img.style.transition = 'opacity 200ms ease-in-out, transform 100ms ease-in-out';
        img.style.opacity    = '1';


        // 3) Swap src + scale on hover
        img.addEventListener('mouseenter', () => {
            img.src = RULES_HOVER_IMG;
            img.style.transform = 'scale(1.1)';
        });
        img.addEventListener('mouseleave', () => {
            img.src = RULES_IMG;
            img.style.transform = 'scale(1)';
        });

        link.appendChild(img);

        // 4) Prepend into the stats panel
        const statsRoot = document.querySelector('.profile-detail__stats');
        if (statsRoot) statsRoot.prepend(link);
    }

    // call it after you have `internalId`
    injectRulesButton();



    // ── Inject our image‐based toggle button ──
    if (!injectToggleButton()) {
        const obs = new MutationObserver((_, o) => {
            if (injectToggleButton()) o.disconnect();
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

// ── Inject Custom Badges for Specific osu! IDs ──

const BADGE_CONFIG = [
  {
    ids: [19637339, 22228239],
    label: 'DEV',
    color: '#E45678',
    classMod: 'dev',
    title: 'Developers',
  },
  {
    ids: [15657407],
    label: 'GFX',
    color: '#0066FF',
    classMod: 'gfx',
    title: 'Effects Designer',
  },
  {
    ids: [24071806],
    label: 'Leader',
    color: '#FFFFFF',
    classMod: 'PL',
    title: 'Project Leader',
    width: '52px',
  },
];

function createBadge({ label, color, classMod, title, width = '40px' }) {
  const el = document.createElement('a');
  el.className = `user-group-badge user-group-badge--${classMod} user-group-badge--profile-page`;
  el.dataset.label = label;
  el.dataset.origTitle = title;
  el.href = 'https://paraliyzed.net';
  el.dataset.hasqtip = '0';
  el.setAttribute('aria-describedby', 'qtip-0');
  el.style.setProperty('--group-colour', color);
  el.style.cssText += `
    height: 15px;
    width: ${width};
    font-size: 12px;
  `;
  return el;
}

function injectBadge(labelClass, badgeEl) {
  const observer = new MutationObserver((_, obs) => {
    const nameHeader = document.querySelector('.profile-info__info .profile-info__name');
    if (!nameHeader) return;

    if (!nameHeader.querySelector(`.user-group-badge--${labelClass}`)) {
      nameHeader.appendChild(badgeEl);
    }

    obs.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

for (const cfg of BADGE_CONFIG) {
  if (cfg.ids.includes(osuId)) {
    injectBadge(cfg.classMod, createBadge(cfg));
  }
}

// ── Special gradient effect for Paraliyzed_evo ──
if (osuId === 19637339) {
  const gradientObserver = new MutationObserver((_, obs) => {
    const nameContainer = document.querySelector('.profile-info__info .profile-info__name');
    if (!nameContainer) return;

    const spans = nameContainer.querySelectorAll('span.u-ellipsis-pre-overflow');

    for (const span of spans) {
      if (
        span.textContent.trim().startsWith('[') ||
        span.dataset.gradientApplied
      ) continue;

      span.style.background = 'linear-gradient(to right, #0000ff 45%, #7b00ff 55%)';
      span.style.webkitBackgroundClip = 'text';
      span.style.webkitTextFillColor = 'transparent';
      span.style.fontWeight = 'bold';
      span.dataset.gradientApplied = 'true';
      break;
    }

    obs.disconnect();
  });

  gradientObserver.observe(document.body, { childList: true, subtree: true });
}

})();
