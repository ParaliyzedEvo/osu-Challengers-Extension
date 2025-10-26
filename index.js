// Detect browser API based on manifest version
const isManifestV2 = !chrome.runtime.getManifest().manifest_version || chrome.runtime.getManifest().manifest_version === 2;
const browserAPI = isManifestV2 && typeof browser !== 'undefined' ? browser : chrome;

console.log('[OTC Popup] Manifest version:', chrome.runtime.getManifest().manifest_version);
console.log('[OTC Popup] Using API:', isManifestV2 ? 'browser (Firefox/MV2)' : 'chrome (Chrome/MV3)');

// Toast notification function
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.error('Toast container not found');
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : 'ℹ';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Validate osu! user ID (must be numeric)
function isValidOsuId(id) {
  return /^\d+$/.test(id);
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  browserAPI.storage.sync.get(['useFullCard'], (result) => {
    const miniCardToggle = document.getElementById('miniCardToggle');
    if (result && result.useFullCard) {
      miniCardToggle.classList.add('active');
    }
  });

// Toggle card setting
  document.getElementById('miniCardToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    const useFullCard = this.classList.contains('active');
    
    console.log('[OTC Popup] Toggle clicked! New state:', useFullCard ? 'full card' : 'mini card');
    
    browserAPI.storage.sync.set({ useFullCard }, () => {
      if (browserAPI.runtime.lastError) {
        console.error('[OTC Popup] Failed to save setting:', browserAPI.runtime.lastError);
        showToast('Failed to save setting', 'error');
      } else {
        console.log('[OTC Popup] Setting saved successfully:', { useFullCard });
        showToast('Setting saved! Refresh the osu! profile page to see changes.', 'success');
        
        // Verify it was saved
        browserAPI.storage.sync.get(['useFullCard'], (result) => {
          console.log('[OTC Popup] Verification - storage now contains:', result);
        });
      }
    });
  });

  // Get current tab's osu! user ID if available
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.url) {
      const match = currentTab.url.match(/https:\/\/osu\.ppy\.sh\/(users|u)\/(\d+)/);
      if (match) {
        const osuId = match[2];
        document.getElementById('userIdInput').value = osuId;
        updateCardLink(osuId);
      }
    }
  });

  // Update card link display
  function updateCardLink(userId) {
    const linkDisplay = document.getElementById('cardLinkDisplay');
    if (userId && isValidOsuId(userId)) {
      linkDisplay.textContent = `https://www.challengersnexus.com/api/card?id=${userId}`;
      linkDisplay.style.display = 'block';
      linkDisplay.onclick = () => copyToClipboard(linkDisplay.textContent);
    } else {
      linkDisplay.style.display = 'none';
    }
  }

  // User ID input change with validation
  document.getElementById('userIdInput').addEventListener('input', (e) => {
    const userId = e.target.value.trim();
    const input = e.target;
    
    if (userId && !isValidOsuId(userId)) {
      input.style.borderBottom = '2px solid #f56565';
    } else {
      input.style.borderBottom = 'none';
    }
    
    updateCardLink(userId);
  });

  // Download main card
  document.getElementById('downloadMainBtn').addEventListener('click', async () => {
    const userId = document.getElementById('userIdInput').value.trim();
    if (!userId) {
      showToast('Please enter a user ID', 'error');
      return;
    }
    if (!isValidOsuId(userId)) {
      showToast('Invalid user ID. Must be numeric only.', 'error');
      return;
    }
    await downloadCard(userId, 'main');
  });

  // Download mini card
  document.getElementById('downloadMiniBtn').addEventListener('click', async () => {
    const userId = document.getElementById('userIdInput').value.trim();
    if (!userId) {
      showToast('Please enter a user ID', 'error');
      return;
    }
    if (!isValidOsuId(userId)) {
      showToast('Invalid user ID. Must be numeric only.', 'error');
      return;
    }
    await downloadCard(userId, 'mini');
  });

  // Download card function
  async function downloadCard(userId, variant) {
    const btn = variant === 'main' ? document.getElementById('downloadMainBtn') : document.getElementById('downloadMiniBtn');
    const originalText = btn.textContent;
    
    try {
      btn.disabled = true;
      btn.textContent = 'Downloading...';
      
      const url = variant === 'mini' 
        ? `https://www.challengersnexus.com/api/card?id=${userId}&option=mini`
        : `https://www.challengersnexus.com/api/card?id=${userId}`;
      
      if (isManifestV2) {
        browserAPI.downloads.download({
          url: url,
          filename: `osu_card_${userId}_${variant}.svg`,
          saveAs: true
        }).then(() => {
          showToast(`${variant === 'main' ? 'Main' : 'Mini'} card downloaded!`, 'success');
        }).catch((error) => {
          showToast('Download failed: ' + error.message, 'error');
        });
      } else {
        browserAPI.downloads.download({
          url: url,
          filename: `osu_card_${userId}_${variant}.svg`,
          saveAs: true
        }, (downloadId) => {
          if (browserAPI.runtime.lastError) {
            showToast('Download failed: ' + browserAPI.runtime.lastError.message, 'error');
          } else {
            showToast(`${variant === 'main' ? 'Main' : 'Mini'} card downloaded!`, 'success');
          }
        });
      }
      
    } catch (error) {
      console.error('Error downloading card:', error);
      showToast('Failed to download card. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // Copy to clipboard
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Link copied to clipboard!', 'success');
    }).catch((err) => {
      showToast('Failed to copy link', 'error');
    });
  }

  // Open links in new tab
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      browserAPI.tabs.create({ url: link.href });
    });
  });
  
});