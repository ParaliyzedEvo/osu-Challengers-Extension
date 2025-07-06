// ==UserScript==
// @name         osu! O!c Mode Injector (v1.8.9 with toggle)
// @namespace    http://tampermonkey.net/
// @version      1.8.7
// @description  Toggle between default stats and O!c Mode custom panel 🎉
// @match        https://osu.ppy.sh/users/*
// @match        https://osu.ppy.sh/u/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(async function() {
  'use strict';
  console.log('[OTC] 🔥 v1.7 start');

  // ── CONFIG ──
  const SUPABASE_URL      = 'https://yqgqoxgykswytoswqpkj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3FveGd5a3N3eXRvc3dxcGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTkxNTEsImV4cCI6MjA2NDI5NTE1MX0.cIWfvz9dlSWwYy7QKSmWpEHc1KVzpB77VzB7TNhQ2ec';
  const SEASON_ID         = 1;

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
  }
  /* remove any odd padding on dt/dd so they line up */
  .oc-panel__entry dt,
  .oc-panel__entry dd {
    margin: 0;
    padding: 0;
  }
`;
    document.head.appendChild(alignStyle);


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
  const osuId = parseInt(location.pathname.split('/')[2], 10);
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
  const me = board.find(r => r.is_target_user);
  if (!me) return console.warn('[OTC] ⚠️ not on leaderboard');
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
        const fmtPct = v => typeof v === 'number' ? (v*100).toFixed(2)+'%' : null;

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
            ['otc_rank',       'O!c Rank',          `#${seasonRank}`],
            ['challenges',     'Challenges',        me.challenges_participated],
            ['avg_accuracy',   'Avg Accuracy',      fmtPct(me.average_accuracy)],
            ['percentile',     'Percentile',        fmtPct(me.percentile)],
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

  // ── 5) Toggle handler ──
    function toggleOCMode() {
        const statsRoot = document.querySelector('.profile-detail__stats');
        if (!statsRoot) return;
        statsRoot.classList.toggle('oc-mode');
        const on = statsRoot.classList.contains('oc-mode');
        document.getElementById('otc-toggle-btn').textContent = on ? 'Exit O!c' : 'O!c Mode';
    }






    function injectToggleButton() {
        // Find the “player info” title row
        const titleRow = document.querySelector('.header-v4__row--title');
        // Bail if it’s not there yet or if we already injected our button
        if (!titleRow || document.getElementById('otc-toggle-btn')) return false;

        // Create the button
        const btn = document.createElement('button');
        btn.id = 'otc-toggle-btn';
        btn.textContent = 'O!c Mode';
        btn.style.cssText = `
    margin-left: auto;
    padding: 0.3em 0.6em;
    border: none;
    border-radius: 4px;
    background-color: #00c7fc;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
  `;

        // Wire it up
        btn.addEventListener('click', e => {
            e.preventDefault();
            buildCustomPanel();   // ensure our panel exists
            toggleOCMode();       // toggle into/out of O!c Mode
        });

        // Append to the title row (it’s already a flex container)
        titleRow.appendChild(btn);
        console.log('[OTC] injected O!c Mode toggle into header-v4__row--title');
        return true;
    }

    // At the bottom of your IIFE, run it once or observe until it’s there:
    if (!injectToggleButton()) {
        new MutationObserver((_, obs) => {
            if (injectToggleButton()) obs.disconnect();
        }).observe(document.body, { childList: true, subtree: true });
    }




    // ── 6) Wire up button & ensure panel exists ──
    let toggleBtn = null;
    const setup = () => {
        // button lives under profile-detail__cover as <button value="osu">osu!</button>
        toggleBtn = document.querySelector(TOGGLE_BUTTON_SEL);
        if (!toggleBtn) return false;
        // rename & attach handler
        toggleBtn.textContent = 'O!c Mode';
        toggleBtn.addEventListener('click', e => {
            e.preventDefault();
            buildCustomPanel();
            toggleOCMode();
        });
        return true;
    };

    // try once, otherwise observe
    if (!setup()) {
        new MutationObserver((_, obs) => {
            if (setup()) obs.disconnect();
        }).observe(document.body, { childList: true, subtree: true });
  }
})();
