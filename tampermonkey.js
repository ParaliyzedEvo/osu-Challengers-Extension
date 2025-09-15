// ==UserScript==
// @name         osu!Challengers Extension
// @namespace    https://github.com/ParaliyzedEvo/osu-Challengers-Extension
// @homepageURL  https://github.com/ParaliyzedEvo/osu-Challengers-Extension
// @supportURL   https://github.com/ParaliyzedEvo/osu-Challengers-Extension/issues
// @updateURL    https://github.com/ParaliyzedEvo/osu-Challengers-Extension/releases/latest/download/tampermoney.js
// @downloadURL  https://github.com/ParaliyzedEvo/osu-Challengers-Extension/releases/latest/download/tampermoney.js
// @author       Paraliyzed_evo and Thunderbirdo
// @icon         https://osu.ppy.sh/favicon.ico
// @version      2.3.3
// @description  Extension to view osu!Challenger stats on osu!Website.
// @match        https://osu.ppy.sh/*
// @connect      ppy.sh
// @connect      challengersnexus.com
// @connect      paraliyzed.net
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function () {
  'use strict';
    let lastUrl = location.href;

	async function runScript() {
	  if (!/^https:\/\/osu\.ppy\.sh\/(users|u)\/\d+/.test(location.href)) return;
	  await new Promise(res => requestAnimationFrame(res));
	  console.log('[OTC] 🔥 v2.3.3 start');

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
	  function fetchChallengerData(internalId) {
		return new Promise((resolve, reject) => {
		  GM.xmlHttpRequest({
			method: 'GET',
			url: `https://www.challengersnexus.com/api/user/profile/${internalId}`,
			onload: function (response) {
			  try {
				const data = JSON.parse(response.responseText);
				resolve(data);
			  } catch (err) {
				reject(`Invalid JSON: ${err}`);
			  }
			},
			onerror: function (err) {
			  reject(`Request failed: ${err}`);
			}
		  });
		});
	  }
	  const osuPage = document.querySelector('.osu-page.osu-page--generic-compact');
	  const userPages = osuPage?.querySelector('.user-profile-pages.ui-sortable');
	  if (!userPages) return console.warn('Could not find user profile container.');

	  const fmtPct = v => typeof v === 'number' ? v.toFixed(2) + '%' : '-';

	  try {
		const apiData = await new Promise((resolve, reject) => {
			GM.xmlHttpRequest({
				method: "GET",
				url: `https://www.challengersnexus.com/api/user/profile/${internalId}`,
				onload: (response) => {
					try {
						resolve(JSON.parse(response.responseText));
					} catch (e) {
						reject(e);
					}
				},
				onerror: reject,
			});
		});
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
				<div id="top-performances"></div>
			</div>
			</div>
		</div>
		`;
		userPages.insertAdjacentHTML('afterbegin', challengersHTML);
		function getRank(acc) {
		if (acc === 100) return "SS";
		if (acc >= 95) return "S";
		if (acc >= 90) return "A";
		if (acc >= 80) return "B";
		if (acc >= 70) return "C";
		return "D";
		}

		function renderMods(mods) {
		if (!mods || !mods.length) return "";
		const modTypes = {
		// Difficulty Reduction
		'EZ': 'DifficultyReduction',
		'NF': 'DifficultyReduction',
		'HT': 'DifficultyReduction',
		'DC': 'DifficultyReduction',
		'NR': 'DifficultyReduction',

		// Difficulty Increase
		'HR': 'DifficultyIncrease',
		'SD': 'DifficultyIncrease',
		'PF': 'DifficultyIncrease',
		'DT': 'DifficultyIncrease',
		'NC': 'DifficultyIncrease',
		'FI': 'DifficultyIncrease',
		'HD': 'DifficultyIncrease',
		'CO': 'DifficultyIncrease',
		'FL': 'DifficultyIncrease',
		'BL': 'DifficultyIncrease',
		'ST': 'DifficultyIncrease',
		'AC': 'DifficultyIncrease',

		// Automation
		'AT': 'Automation',
		'CN': 'Automation',
		'RX': 'Automation',
		'AP': 'Automation',
		'SO': 'Automation',

		// Conversion
		'TP': 'Conversion',
		'DA': 'Conversion',
		'CL': 'Conversion',
		'RD': 'Conversion',
		'MR': 'Conversion',
		'AL': 'Conversion',
		'SW': 'Conversion',
		'SG': 'Conversion',
		'IN': 'Conversion',
		'CS': 'Conversion',
		'HO': 'Conversion',
		'1K': 'Conversion',
		'2K': 'Conversion',
		'3K': 'Conversion',
		'4K': 'Conversion',
		'5K': 'Conversion',
		'6K': 'Conversion',
		'7K': 'Conversion',
		'8K': 'Conversion',
		'9K': 'Conversion',
		'10K': 'Conversion',

		// Fun
		'TR': 'Fun',
		'WG': 'Fun',
		'SI': 'Fun',
		'GR': 'Fun',
		'DF': 'Fun',
		'WU': 'Fun',
		'WD': 'Fun',
		'TC': 'Fun',
		'BR': 'Fun',
		'AD': 'Fun',
		'FF': 'Fun',
		'MU': 'Fun',
		'NS': 'Fun',
		'MG': 'Fun',
		'RP': 'Fun',
		'AS': 'Fun',
		'FR': 'Fun',
		'BU': 'Fun',
		'SY': 'Fun',
		'DP': 'Fun',
		'BM': 'Fun',

		// System
		'SV2': 'System',
		'TD': 'System',
		};

		const modNames = {
		// Difficulty Reduction
		'EZ': 'Easy',
		'NF': 'No Fail',
		'HT': 'Half Time',
		'DC': 'Daycore',
		'NR': 'No Release',

		// Difficulty Increase
		'HR': 'Hard Rock',
		'SD': 'Sudden Death',
		'PF': 'Perfect',
		'DT': 'Double Time',
		'NC': 'Nightcore',
		'FI': 'Fade In',
		'HD': 'Hidden',
		'CO': 'Cover',
		'FL': 'Flashlight',
		'BL': 'Blinds',
		'ST': 'Strict Tracking',
		'AC': 'Accuracy Challenge',

		// Automation
		'AT': 'Autoplay',
		'CN': 'Cinema',
		'RX': 'Relax',
		'AP': 'Autopilot',
		'SO': 'Spun Out',

		// Conversion
		'TP': 'Target Practice',
		'DA': 'Difficulty Adjust',
		'CL': 'Classic',
		'RD': 'Random',
		'MR': 'Mirror',
		'AL': 'Alternate',
		'SW': 'Swap',
		'SG': 'Single Tap',
		'IN': 'Invert',
		'CS': 'Constant Speed',
		'HO': 'Hold Off',
		'1K': '1 Key',
		'2K': '2 Keys',
		'3K': '3 Keys',
		'4K': '4 Keys',
		'5K': '5 Keys',
		'6K': '6 Keys',
		'7K': '7 Keys',
		'8K': '8 Keys',
		'9K': '9 Keys',
		'10K': '10 Keys',

		// Fun
		'TR': 'Transform',
		'WG': 'Wiggle',
		'SI': 'Spin In',
		'GR': 'Grow',
		'DF': 'Deflate',
		'WU': 'Wind Up',
		'WD': 'Wind Down',
		'TC': 'Traceable',
		'BR': 'Barrel Roll',
		'AD': 'Approach Different',
		'FF': 'Floating Fruits',
		'MU': 'Muted',
		'NS': 'No Scope',
		'MG': 'Magnetised',
		'RP': 'Repel',
		'AS': 'Adaptive Speed',
		'FR': 'Freeze Frame',
		'BU': 'Bubbles',
		'SY': 'Synesthesia',
		'DP': 'Depth',
		'BM': 'Bloom',

		// System
		'SV2': 'Score V2',
		'TD': 'Touch Device',
		};
		
		return mods.map(mod => {
			const acronym = mod.acronym;
			const modType = modTypes[acronym] || 'Conversion';
			const modName = modNames[acronym] || acronym;
			
			return `<div class="mod mod--type-${modType}" data-orig-title="${modName}" data-hasqtip="8" aria-describedby="qtip-8">
					<div class="mod__icon mod__icon--${acronym}" data-acronym="${acronym}"></div>
					</div>`;
		}).join("");
		}

		try {
		const scores = apiData?.data?.scores || [];
		if (scores.length) {
			// sort by placement, then by score
			const sortedScores = scores.sort((a, b) => {
			if (a.calculated_rank !== b.calculated_rank) {
				return a.calculated_rank - b.calculated_rank; // lower placement first
			}
			return b.score - a.score; // then highest score
			});
			const topThree = sortedScores.slice(0, 3);
			const container = document.getElementById("top-performances");

			topThree.forEach(score => {
			const rank = getRank(score.accuracy);
			const mapTitle = score.playlists?.beatmap_title || "Unknown";
			const mapArtist = score.playlists?.beatmap_artist || "Unknown";
			const mapDiff = score.playlists?.beatmap_version || "";
			const acc = score.accuracy.toFixed(2) + "%";
			const mods = renderMods(score.mods_detailed);
			const placement = score.calculated_rank;

			const html = `
				<div class="play-detail play-detail--highlightable play-detail--pin-sortable">
				<div class="play-detail__group play-detail__group--top">
					<div class="play-detail__icon play-detail__icon--main">
					<div class="score-rank score-rank--full score-rank--${rank}"></div>
					</div>
					<div class="play-detail__detail">
					<a class="play-detail__title u-ellipsis-overflow" href="https://osu.ppy.sh/beatmaps/${score.playlists?.beatmap_id || ''}">
						${mapTitle} <small class="play-detail__artist">by ${mapArtist}</small>
					</a>
					<div class="play-detail__beatmap-and-time">
						<span class="play-detail__beatmap">${mapDiff}</span>
						<span class="play-detail__time"><time datetime="${score.submitted_at}">${new Date(score.submitted_at).toLocaleDateString()}</time></span>
					</div>
					</div>
				</div>
				<div class="play-detail__group play-detail__group--bottom">
					<div class="play-detail__score-detail play-detail__score-detail--score">
					<div class="play-detail__score-detail-top-right">
						<div class="play-detail__accuracy-and-weighted-pp">
						<span class="play-detail__accuracy">${acc}</span>
						</div>
					</div>
					</div>
					<div class="play-detail__score-detail play-detail__score-detail--mods">
					${mods}
					</div>
					<div class="play-detail__pp"><span>Rank #${placement}</span></div>
				</div>
				</div>
			`;
			container.innerHTML += html;
			});
		}
		} catch (err) {
		console.error("Failed to render Top 3 performances:", err);
		}
		async function svgToCanvas(svgSourceUrl, maxWidth = 727) {
		return new Promise(async (resolve, reject) => {
			try {
			console.log('Fetching SVG from:', svgSourceUrl);
			const svgText = await new Promise((resolveFetch, rejectFetch) => {
				GM.xmlHttpRequest({
				method: 'GET',
				url: svgSourceUrl,
				onload: (response) => {
					if (response.status >= 200 && response.status < 300) {
					resolveFetch(response.responseText);
					} else {
					rejectFetch(`HTTP error: ${response.status}`);
					}
				},
				onerror: (err) => rejectFetch(err),
				});
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
			const displayWidth = 727;
			const displayHeight = 130;

			console.log('Display dimensions:', displayWidth, 'x', displayHeight);

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			const dpr = window.devicePixelRatio || 1;

			canvas.width = displayWidth * dpr;
			canvas.height = displayHeight * dpr;
			canvas.style.width = `${displayWidth}px`;
			canvas.style.height = `${displayHeight}px`;
			ctx.scale(dpr, dpr);

			const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
			const svgDataUrl = URL.createObjectURL(svgBlob);
			const img = new Image();
			img.onload = () => {
				console.log('SVG image loaded successfully');
				ctx.clearRect(0, 0, displayWidth, displayHeight);
				ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
				
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
			
			img.width = displayWidth;
			img.height = displayHeight;
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