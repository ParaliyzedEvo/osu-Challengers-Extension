(function () {
  'use strict';
    let lastUrl = location.href;

	async function runScript() {
	  if (!/^https:\/\/osu\.ppy\.sh\/(users|u)\/\d+/.test(location.href)) return;
	  await new Promise(res => requestAnimationFrame(res));
	  console.log('[OTC] 🔥 v2.2.0 start');

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

	  function crossOriginFetch(url, method = 'GET', headers = {}, body = null) {
	  return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
		  { type: 'fetch', url, method, headers, body },
		  (response) => {
			if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
			if (!response || typeof response.data !== 'string') {
			  console.error('[OTC] ❌ Invalid response from background:', response);
			  return reject('Invalid background response');
			}

			try {
			  const parsed = JSON.parse(response.data);
			  resolve(parsed);
			} catch (e) {
			  console.error('[OTC] ❌ Failed to parse JSON:');
			  reject(e);
			}
		  }
		);
	  });
	  }

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
	  const styles = [`
	  .oc-challenger-container {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		padding: 10px 0;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	  }
	  
	  .kudosu-box {
	    display: flex;
	    justify-content: center;
	    align-items: center;
	    width: 900px;
	    height: 100px;
	  }
	  
	  .oc-stat {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		font-family: 'Inter', sans-serif;
		min-width: 80px;
	  }

	  .oc-stat-label {
		font-size: 14px;
		color: white;
		font-weight: bold;
		margin-bottom: 4px;
		font-family: Torus, Inter, 'Helvetica Neue', Tahoma, Arial, 'Hiragino Kaku Gothic ProN', Meiryo, 'Microsoft YaHei', 'Apple SD Gothic Neo', sans-serif;
	  }

	  .oc-stat-value {
		font-size: 40px;
		font-weight: 300;
		color: #fff;
		font-family: Torus, Inter, 'Helvetica Neue', Tahoma, Arial, 'Hiragino Kaku Gothic ProN', Meiryo, 'Microsoft YaHei', 'Apple SD Gothic Neo', sans-serif;
	  }

	  .oc-description {
		margin-top: 12px;
		font-size: 14px;
		color: #ccc;
	  }

	  .oc-challenger-block {
	    display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	  }
	`];
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

		  badgeEl.style.transform = `translate(-${offset}px, 2px)`;

		  nameHeader.appendChild(badgeEl);
		  obs.disconnect();
		}
	  });

	  observer.observe(document.body, { childList: true, subtree: true });
	  }

	  function injectUsernameStyle(userId, styleFn) {
		  const selector = '.profile-info__info .profile-info__name';

		  const observer = new MutationObserver((_, obs) => {
			const nameContainer = document.querySelector(selector);
			if (!nameContainer) return;

			const spans = nameContainer.querySelectorAll('span.u-ellipsis-pre-overflow');
			const hasInspectorTag = Array.from(spans).some(span => span.id === 'inspector_user_tag');
			const validSpans = Array.from(spans).filter(span =>
			  span.id !== 'inspector_user_tag' && !span.dataset.customApplied
			);

			if (!hasInspectorTag || validSpans.length === 0) return;

			const usernameSpan = validSpans[0];
			styleFn(usernameSpan);
			usernameSpan.dataset.customApplied = 'true';

			obs.disconnect();
		  });

		  observer.observe(document.body, { childList: true, subtree: true });
		}

	  if (osuId === 19637339)
		injectUsernameStyle(osuId, span => Object.assign(span.style, {
		  background: 'linear-gradient(to right, #ff00ff 45%, #ba00ff 55%)',
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
		injectUsernameStyle(osuId, span => Object.assign(span.style, {
		  background: 'linear-gradient(to right, #ff0000 35%, #7b00ff 65%)',
		  WebkitBackgroundClip: 'text',
		  WebkitTextFillColor: 'transparent',
		  fontWeight: 'bold',
		}));

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
		  const titleSelector = '.header-v4__row--title .header-v4__title';

		  function tryInject() {
			const titleDiv = document.querySelector(titleSelector);
			if (!titleDiv || titleDiv.querySelector('.oc-no-profile-message')) return false;

			const span = document.createElement('span');
			span.className = 'oc-no-profile-message';
			span.style.cssText = 'margin-top:7px;margin-left:5px;font-size:12px;color:gray;';
			span.textContent = 'No osu!Challengers profile found.';
			titleDiv.appendChild(span);
			return true;
		  }

		  if (tryInject()) return;

		  const observer = new MutationObserver((mutations, obs) => {
			if (tryInject()) obs.disconnect();
		  });

		  observer.observe(document.body, { childList: true, subtree: true });
		}

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
		injectNoProfileMessage();
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

	  function injectChallengersTab() {
		  const osuPage = document.querySelector('.osu-page.osu-page--generic-compact');
		  if (!osuPage) return;

		  const extraTabs = osuPage.querySelector('.page-extra-tabs');
		  if (!extraTabs) return;

		  const profileExtra = extraTabs.querySelector('.page-mode--profile-page-extra.hidden-xs.ui-sortable');
		  if (!profileExtra) return;

		  const challengersTabHTML = `
			  <span class="page-mode-link page-mode-link--profile-page page-mode-link--is-active">
				<span class="fake-bold"
					  data-content="Challengers"
					  style="color: #fac517; font-family: Torus, Inter, 'Helvetica Neue', Tahoma, Arial, 'Hiragino Kaku Gothic ProN', Meiryo, 'Microsoft YaHei', 'Apple SD Gothic Neo', sans-serif;">
				  Challengers
				</span>
			  </span>
		  `;

		  if (profileExtra.querySelector('a[data-page-id="challengers"]')) return;

		  profileExtra.insertAdjacentHTML('afterbegin', challengersTabHTML);
		}

	function waitForChallengersTabContainer() {
	  if (document.querySelector('.osu-page.osu-page--generic-compact .page-extra-tabs .page-mode--profile-page-extra.hidden-xs.ui-sortable')) {
		injectChallengersTab();
	  } else {
		const observer = new MutationObserver((mutations, obs) => {
		  if (document.querySelector('.osu-page.osu-page--generic-compact .page-extra-tabs .page-mode--profile-page-extra.hidden-xs.ui-sortable')) {
			injectChallengersTab();
			obs.disconnect();
		  }
		});
		observer.observe(document.body, { childList: true, subtree: true });
	  }
	}

	async function injectChallengersPage(internalId) {
	  const osuPage = document.querySelector('.osu-page.osu-page--generic-compact');
	  const userPages = osuPage?.querySelector('.user-profile-pages.ui-sortable');
	  if (!userPages) return console.warn('Could not find user profile container.');
	  
	  const fmtPct = v => typeof v === 'number' ? v.toFixed(2) + '%' : '-';
	  
	  try {
		const apiData = await crossOriginFetch(`https://www.challengersnexus.com/api/user/profile/${internalId}`);
		const apiUser = apiData?.data?.user || {};
		const apiStats = apiData?.data?.stats || {};
		const apiStreaks = apiData?.data?.streaks || {};
		if (!apiData) return console.warn('Invalid data from API.');

		const me = board?.find(r => r.is_target_user) || {};
		const statsData = await callRpc('get_user_stats', { p_user_id: internalId });
		const comp = Array.isArray(statsData) ? statsData[0] || {} : {};

		const svgUrl = `https://api.paraliyzed.net/api/card?id=${osuId}&option=mini`;
		let challengersHTML = `
		  <div data-page-id="challengers">
			<div class="page-extra">
			  <div class="u-relative">
				<h2 class="title title--page-extra">Challengers!</h2>
			  </div>
			  <div class="lazy-load">
				<div class="kudosu-box">
				  <div class="oc-challenger-block">
					<div class="oc-challenger-container">
					  <div id="svg-container" style="max-width: 727px; overflow: hidden;">
					  </div>
					</div>
				  </div>
				</div>
				<div class="title title--page-extra-small">Top 3 Performances</div>
			  </div>
			</div>
		  </div>
		`;
		userPages.insertAdjacentHTML('afterbegin', challengersHTML);
		async function svgToCanvas(svgSourceUrl, maxWidth = 727) {
		  return new Promise(async (resolve, reject) => {
			try {
			  console.log('Fetching SVG from:', svgSourceUrl);
			  const svgText = await new Promise((resolveMsg, rejectMsg) => {
				chrome.runtime.sendMessage(
				  { type: 'fetch', url: svgSourceUrl, method: 'GET', headers: {}, body: null },
				  (response) => {
					if (chrome.runtime.lastError) return rejectMsg(chrome.runtime.lastError.message);
					if (!response || typeof response.data !== 'string') {
					  console.error('[OTC] ❌ Invalid response from background:', response);
					  return rejectMsg('Invalid background response');
					}
					resolveMsg(response.data);
				  }
				);
			  });
			  
			  console.log('SVG fetch successful, length:', svgText?.length);
			  
			  if (!svgText || typeof svgText !== 'string') {
				throw new Error('Invalid SVG response');
			  }
			  const tempDiv = document.createElement('div');
			  tempDiv.style.position = 'absolute';
			  tempDiv.style.left = '-9999px';
			  tempDiv.innerHTML = svgText;
			  document.body.appendChild(tempDiv);
			  
			  const svgElement = tempDiv.querySelector('svg');
			  if (!svgElement) {
				document.body.removeChild(tempDiv);
				reject(new Error('No SVG found in response'));
				return;
			  }
			  const svgWidth = parseFloat(svgElement.getAttribute('width')) || maxWidth;
			  const svgHeight = parseFloat(svgElement.getAttribute('height')) || (svgWidth * 0.3);
			  
			  console.log('SVG dimensions:', svgWidth, 'x', svgHeight);
			  const canvas = document.createElement('canvas');
			  const ctx = canvas.getContext('2d');
			  const dpr = window.devicePixelRatio || 1;
			  canvas.width = svgWidth * dpr;
			  canvas.height = svgHeight * dpr;
			  canvas.style.width = `${Math.min(svgWidth, maxWidth)}px`;
			  canvas.style.height = `${svgHeight * (Math.min(svgWidth, maxWidth) / svgWidth)}px`;
			  
			  ctx.scale(dpr, dpr);
			  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
			  const svgDataUrl = URL.createObjectURL(svgBlob);
			  
			  const img = new Image();
			  img.onload = () => {
				console.log('SVG image loaded successfully');
				ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
				URL.revokeObjectURL(svgDataUrl);
				document.body.removeChild(tempDiv);
				resolve(canvas);
			  };
			  img.onerror = (err) => {
				console.error('Image load error:', err);
				URL.revokeObjectURL(svgDataUrl);
				document.body.removeChild(tempDiv);
				reject(new Error('Failed to load SVG as image'));
			  };
			  img.src = svgDataUrl;
			  
			} catch (error) {
			  console.error('SVG to canvas error:', error);
			  reject(error);
			}
		  });
		}
		try {
		  const canvas = await svgToCanvas(svgUrl, 727);
		  const svgContainer = document.getElementById('svg-container');
		  if (svgContainer) {
			  canvas.style.cssText = `
				max-width: 100%;
				height: auto;
				will-change: auto !important;
				transform: none !important;
				backface-visibility: visible !important;
			  `;
			
			const link = document.createElement('a');
			link.rel = 'nofollow';
			link.target = '_blank';
			link.href = `https://www.challengersnexus.com/profile/${internalId}`;
			link.appendChild(canvas);
			
			svgContainer.appendChild(link);
		  }
		} catch (svgError) {
		  console.warn('SVG to canvas conversion failed, using fallback:', svgError);
		  const svgContainer = document.getElementById('svg-container');
		  if (svgContainer) {
			svgContainer.innerHTML = `
			  <div class="oc-challenger-container">
				<div class="oc-stat"><div class="oc-stat-label">Current Streak</div><div class="oc-stat-value">${apiStreaks.currentStreak ?? '-'}</div></div>
				<div class="oc-stat"><div class="oc-stat-label">Best Streak</div><div class="oc-stat-value">${apiStreaks.longestStreak ?? '-'}</div></div>
				<div class="oc-stat"><div class="oc-stat-label">Avg Acc</div><div class="oc-stat-value">${fmtPct(me.average_accuracy)}</div></div>
				<div class="oc-stat"><div class="oc-stat-label">First Places</div><div class="oc-stat-value">${apiStats.firstPlaceCount ?? '-'}</div></div>
			  </div>
			  <div class="oc-challenger-container">
				<div class="oc-stat"><div class="oc-stat-label">Seasonal Rank</div><div class="oc-stat-value">#${me.position ?? '-'}</div></div>
				<div class="oc-stat"><div class="oc-stat-label">Top</div><div class="oc-stat-value">${fmtPct(100 - me.percentile)}</div></div>
				<div class="oc-stat"><div class="oc-stat-label">Total Score</div><div class="oc-stat-value">${apiStats.totalScorePoints ?? '-'}</div></div>
				<div class="oc-stat"><div class="oc-stat-label">Total Plays</div><div class="oc-stat-value">${apiStats.totalScores ?? '-'}</div></div>
			  </div>
			`;
		  }
		}
	  } catch (err) {
		console.error('Failed to inject Challengers page:', err);
	  }
	}
	console.log("[OTC] internalId = " + internalId);
	await injectChallengersPage(internalId);
	waitForChallengersTabContainer();
}
  runScript();

  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function () {
    pushState.apply(this, arguments);
    setTimeout(checkUrlChange, 100);
  };
  history.replaceState = function () {
    replaceState.apply(this, arguments);
    setTimeout(checkUrlChange, 100);
  };

  window.addEventListener('popstate', checkUrlChange);

  setInterval(checkUrlChange, 500);

  function checkUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      runScript();
    }
  }
})();
