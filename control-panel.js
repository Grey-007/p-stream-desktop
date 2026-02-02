const toggle = document.getElementById('discord-rpc-toggle');
const versionText = document.getElementById('version-text');
const checkUpdatesBtn = document.getElementById('check-updates-btn');
const updateNowBtn = document.getElementById('update-now-btn');
const resetAppBtn = document.getElementById('reset-app-btn');
const uninstallAppBtn = document.getElementById('uninstall-app-btn');
const streamUrlInput = document.getElementById('stream-url-input');
const saveUrlBtn = document.getElementById('save-url-btn');
const warpToggle = document.getElementById('warp-toggle');
const warpStatus = document.getElementById('warp-status');

// Load initial state
async function loadState() {
  try {
    const enabled = await window.controlPanel.getDiscordRPCEnabled();
    toggle.checked = enabled;
  } catch (error) {
    console.error('Failed to load Discord RPC state:', error);
  }

  try {
    const version = await window.controlPanel.getVersion();
    versionText.textContent = `v${version}`;
  } catch (error) {
    console.error('Failed to load version:', error);
    versionText.textContent = 'Unknown';
  }

  try {
    const url = await window.controlPanel.getStreamUrl();
    streamUrlInput.value = url;
  } catch (error) {
    console.error('Failed to load stream URL:', error);
  }

  // Load WARP VPN state
  try {
    const warpEnabled = await window.controlPanel.getWarpEnabled();
    warpToggle.checked = warpEnabled;
    updateWarpStatus();
  } catch (error) {
    console.error('Failed to load WARP state:', error);
  }

  // Check if we're in development mode and show releases page button
  try {
    const updateCheck = await window.controlPanel.checkForUpdates();
    if (updateCheck.isDevelopment) {
      checkUpdatesBtn.textContent = 'Open Releases Page';
      updateNowBtn.hidden = true;
      versionText.textContent = `v${updateCheck.version} (Dev Mode)`;
    } else {
      checkUpdatesBtn.textContent = 'Check for Updates';
      updateNowBtn.hidden = true;
    }
  } catch (error) {
    console.log('Could not determine if in dev mode:', error);
    checkUpdatesBtn.textContent = 'Check for Updates';
    updateNowBtn.hidden = true;
  }
}

// Handle toggle change
toggle.addEventListener('change', async (event) => {
  try {
    await window.controlPanel.setDiscordRPCEnabled(event.target.checked);
  } catch (error) {
    console.error('Failed to update Discord RPC state:', error);
    // Revert toggle on error
    toggle.checked = !event.target.checked;
  }
});

// Update WARP status display
async function updateWarpStatus() {
  try {
    const status = await window.controlPanel.getWarpStatus();
    if (status.enabled) {
      warpStatus.textContent = `Connected via ${status.proxyHost}:${status.proxyPort}`;
      warpStatus.style.color = '#4ade80';
    } else if (status.error) {
      warpStatus.textContent = `Error: ${status.error}`;
      warpStatus.style.color = '#f87171';
    } else {
      warpStatus.textContent = 'Disabled';
      warpStatus.style.color = '#a1a1aa';
    }
  } catch (error) {
    warpStatus.textContent = '';
  }
}

// Handle WARP toggle change
warpToggle.addEventListener('change', async (event) => {
  const enabling = event.target.checked;
  warpToggle.disabled = true;
  warpStatus.textContent = enabling ? 'Connecting...' : 'Disconnecting...';
  warpStatus.style.color = '#fbbf24';

  try {
    const result = await window.controlPanel.setWarpEnabled(enabling);
    if (result.success) {
      warpToggle.checked = enabling;
      await updateWarpStatus();
    } else {
      warpToggle.checked = !enabling;
      warpStatus.textContent = result.error || 'Failed';
      warpStatus.style.color = '#f87171';
    }
  } catch (error) {
    console.error('Failed to update WARP state:', error);
    warpToggle.checked = !enabling;
    warpStatus.textContent = error.message || 'Failed';
    warpStatus.style.color = '#f87171';
  } finally {
    warpToggle.disabled = false;
  }
});

// Handle update check button
checkUpdatesBtn.addEventListener('click', async () => {
  const buttonText = checkUpdatesBtn.textContent;

  if (buttonText === 'Open Releases Page') {
    await handleOpenReleasesPage();
  } else {
    await handleCheckForUpdates();
  }
});

// Handle Update now button (when update is available)
updateNowBtn.addEventListener('click', handleUpdateNow);

async function handleCheckForUpdates() {
  checkUpdatesBtn.disabled = true;
  checkUpdatesBtn.textContent = 'Checking...';

  try {
    const result = await window.controlPanel.checkForUpdates();

    if (result.error) {
      versionText.textContent = result.error;
      updateNowBtn.hidden = true;
      checkUpdatesBtn.textContent = 'Check for Updates';
      // Reset after a few seconds
      setTimeout(() => {
        if (versionText.textContent === result.error) {
          versionText.textContent = `v${result.version || 'Unknown'}`;
        }
      }, 5000);
    } else if (result.isDevelopment) {
      // Development mode - show releases page button
      versionText.textContent = `v${result.version} (Dev Mode)`;
      updateNowBtn.hidden = true;
      checkUpdatesBtn.textContent = 'Open Releases Page';
    } else if (result.updateAvailable) {
      // Update available - show "Update now" (trigger updater) and "Open Releases Page"
      versionText.textContent = `Update available: v${result.version}`;
      updateNowBtn.hidden = false;
      checkUpdatesBtn.textContent = 'Open Releases Page';
    } else {
      // Already up to date
      const displayVersion = result.version || result.currentVersion || 'Unknown';
      versionText.textContent = `v${displayVersion} (Latest)`;
      updateNowBtn.hidden = true;
      checkUpdatesBtn.textContent = 'Up to Date';
      setTimeout(() => {
        checkUpdatesBtn.textContent = 'Check for Updates';
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
    versionText.textContent = 'Error checking for updates';
    checkUpdatesBtn.textContent = 'Check for Updates';
    // Reset after a few seconds
    setTimeout(() => {
      if (versionText.textContent === 'Error checking for updates') {
        window.controlPanel.getVersion().then((version) => {
          versionText.textContent = `v${version}`;
        });
      }
    }, 5000);
  } finally {
    checkUpdatesBtn.disabled = false;
  }
}

async function handleOpenReleasesPage() {
  try {
    await window.controlPanel.openReleasesPage();
  } catch (error) {
    console.error('Failed to open releases page:', error);
    versionText.textContent = 'Error opening releases page';
    setTimeout(() => {
      window.controlPanel.getVersion().then((version) => {
        versionText.textContent = `v${version}`;
      });
    }, 3000);
  }
}

async function handleUpdateNow() {
  updateNowBtn.disabled = true;
  checkUpdatesBtn.disabled = true;
  updateNowBtn.textContent = 'Starting update...';

  try {
    const result = await window.controlPanel.installUpdate();
    if (result.updateInstalling) {
      // App may quit (Windows) or updater window is showing
      versionText.textContent = 'Update in progress...';
    } else if (result.error) {
      versionText.textContent = result.error;
      updateNowBtn.textContent = 'Update now';
      updateNowBtn.disabled = false;
      checkUpdatesBtn.disabled = false;
      setTimeout(async () => {
        if (versionText.textContent === result.error) {
          try {
            const v = await window.controlPanel.getVersion();
            versionText.textContent = `v${v}`;
          } catch {
            versionText.textContent = 'Unknown';
          }
        }
      }, 5000);
    } else {
      // No update or platform shows file (Linux/macOS)
      updateNowBtn.textContent = 'Update now';
      updateNowBtn.disabled = false;
      checkUpdatesBtn.disabled = false;
    }
  } catch (error) {
    console.error('Update now failed:', error);
    versionText.textContent = 'Update failed';
    updateNowBtn.textContent = 'Update now';
    updateNowBtn.disabled = false;
    checkUpdatesBtn.disabled = false;
  }
}

// Handle save URL button
saveUrlBtn.addEventListener('click', async () => {
  const url = streamUrlInput.value.trim();

  if (!url) {
    alert('Please enter a valid URL');
    return;
  }

  // Validate URL format (basic validation)
  try {
    // If it doesn't start with http:// or https://, add https://
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = `https://${url}`;
    }

    // Validate URL format
    new URL(formattedUrl);

    // Keep the full URL (including path) - just use as entered
    const urlToSave = url;

    saveUrlBtn.disabled = true;
    saveUrlBtn.textContent = 'Saving...';

    try {
      await window.controlPanel.setStreamUrl(urlToSave);
      saveUrlBtn.textContent = 'Saved!';

      // Reset button text after a short delay
      setTimeout(() => {
        saveUrlBtn.textContent = 'Save';
        saveUrlBtn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to save stream URL:', error);
      saveUrlBtn.textContent = 'Save';
      saveUrlBtn.disabled = false;
      alert('Failed to save URL. Please try again.');
    }
  } catch {
    alert('Please enter a valid URL or domain name');
  }
});

// Handle Enter key in URL input
streamUrlInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    saveUrlBtn.click();
  }
});

// Handle reset app button
resetAppBtn.addEventListener('click', async () => {
  // Confirm with user
  const confirmed = confirm(
    'Are you sure you want to reset the app? This will clear all local data and cookies. This action cannot be undone.',
  );

  if (!confirmed) {
    return;
  }

  resetAppBtn.disabled = true;
  resetAppBtn.textContent = 'Resetting...';

  try {
    await window.controlPanel.resetApp();
    resetAppBtn.textContent = 'Reset Complete';

    // Show success message
    alert('App has been reset successfully. The app will reload.');

    // Reload the control panel after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('Failed to reset app:', error);
    resetAppBtn.textContent = 'Reset App';
    alert('Failed to reset app. Please try again.');
  } finally {
    resetAppBtn.disabled = false;
  }
});

// Handle uninstall app button
uninstallAppBtn.addEventListener('click', async () => {
  // Strong warning with multiple confirmations
  const firstConfirm = confirm(
    '⚠️ WARNING: This will permanently delete the P-Stream app and ALL associated data from your computer.\n\n' +
      'This includes:\n' +
      '• All app settings\n' +
      '• All cookies and browsing data\n' +
      '• All stored preferences\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Are you absolutely sure you want to continue?',
  );

  if (!firstConfirm) {
    return;
  }

  // Second confirmation
  const secondConfirm = confirm(
    'Final confirmation: Are you sure you want to uninstall P-Stream?\n\n' +
      'The app will be removed from your computer and all data will be deleted.',
  );

  if (!secondConfirm) {
    return;
  }

  uninstallAppBtn.disabled = true;
  uninstallAppBtn.textContent = 'Uninstalling...';

  try {
    const result = await window.controlPanel.uninstallApp();

    if (result.success) {
      uninstallAppBtn.textContent = 'Uninstalling...';
      // Show final message
      alert(result.message || 'The app is being uninstalled. Please follow any additional instructions that appear.');
      // The app should close/quit after uninstall
    } else {
      uninstallAppBtn.textContent = 'Uninstall App';
      alert(
        result.error ||
          'Failed to uninstall the app. You may need to uninstall it manually through your system settings.',
      );
      uninstallAppBtn.disabled = false;
    }
  } catch (error) {
    console.error('Failed to uninstall app:', error);
    uninstallAppBtn.textContent = 'Uninstall App';
    alert(
      'An error occurred while trying to uninstall the app. You may need to uninstall it manually through your system settings.',
    );
    uninstallAppBtn.disabled = false;
  }
});

// Load state when page loads
loadState();
