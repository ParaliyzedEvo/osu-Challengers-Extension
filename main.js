// ==UserScript==
// @name         osu! Season Rank Injector (v1.4 – optimized)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Inject Season Rank via get_season_leaderboard_with_user 🎉
// @match        https://osu.ppy.sh/users/*
// @match        https://osu.ppy.sh/u/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  console.log('[OTC] 🔥 v1.4 start');

  const SUPABASE_URL      = 'https://yqgqoxgykswytoswqpkj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3FveGd5a3N3eXRvc3dxcGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTkxNTEsImV4cCI6MjA2NDI5NTE1MX0.cIWfvz9dlSWwYy7QKSmWpEHc1KVzpB77VzB7TNhQ2ec';
  const SEASON_ID         = 1;

  const RPC_GET_INTERNAL        = 'get_user_id_from_osu_id';
  const RPC_GET_INTERNAL_PARAM  = 'p_osu_id';
  const RPC_SEASON_LEADER_FUNC  = 'get_season_leaderboard_with_user';
  const RPC_SEASON_USER_PARAM   = 'user_id_param';
  const RPC_SEASON_SEASON_PARAM = 'season_id_param';

  const VALS_SEL = '.profile-detail__values';
  const RANK_SEL = '.value-display--rank';

  const callRpc = async (funcName, params) => {
    console.log('[OTC] 📡 RPC', funcName, params);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcName}`, {
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
      console.error('[OTC] ❌', funcName, 'HTTP', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    console.log('[OTC] ✅', funcName, 'returned', data);
    return data;
  };

  const inject = (rank) => {
    const container = document.querySelector(VALS_SEL);
    if (!container || container.querySelector('.value-display--season')) return false;

    const template = container.querySelector(RANK_SEL);
    if (!template) return false;

    const card = template.cloneNode(true);
    card.classList.add('value-display--season');
    card.querySelector('.value-display__label').textContent = 'Season Rank';
    card.querySelector('.value-display__value').textContent = `#${rank}`;
    container.appendChild(card);

    console.log('[OTC] 🎉 injected Season Rank #' + rank);
    return true;
  };

  (async () => {
    const parts = window.location.pathname.split('/');
    const osuId = parseInt(parts[2], 10);
    if (!osuId) return console.warn('[OTC] no osu! user ID found');
    console.log('[OTC] osuId =', osuId);

    const internalRaw = await callRpc(RPC_GET_INTERNAL, { [RPC_GET_INTERNAL_PARAM]: osuId });

    let internalId = null;
    if (typeof internalRaw === 'number') {
      internalId = internalRaw;
    } else if (Array.isArray(internalRaw)) {
      internalId = internalRaw.find(val => typeof val === 'number');
    } else if (internalRaw && typeof internalRaw === 'object') {
      internalId = Object.values(internalRaw).find(val => typeof val === 'number');
    }

    if (!internalId) return console.error('[OTC] ❌ could not resolve internal ID');
    console.log('[OTC] internalId =', internalId);

    const board = await callRpc(RPC_SEASON_LEADER_FUNC, {
      [RPC_SEASON_USER_PARAM]: internalId,
      [RPC_SEASON_SEASON_PARAM]: SEASON_ID,
    });

    if (!Array.isArray(board)) return console.error('[OTC] ❌ invalid leaderboard response');

    const me = board.find(r => r.is_target_user);
    if (!me) return console.warn('[OTC] ⚠️ you are not on the season leaderboard');

    const seasonRank = me.position;
    console.log('[OTC] seasonRank =', seasonRank);

    if (inject(seasonRank)) return;

    const observer = new MutationObserver((_, obs) => {
      if (inject(seasonRank)) obs.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  })();
})();
