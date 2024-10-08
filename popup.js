// Configuration des IDs des switches et leur correspondance avec les paramètres
const settingsMappings = {
  'spoofNavigator': 'spoofNavigator',
  'spoofUserAgent': 'spoofUserAgent',
  'spoofCanvas': 'spoofCanvas',
  'blockImages': 'blockImages',
  'blockJS': 'blockJS'
};

// État global des paramètres
let currentSettings = {};

// Initialisation de l'interface
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Récupération de l'état actuel depuis le background script
    const settings = await chrome.runtime.sendMessage({ type: 'getStatus' });
    updateInterface(settings);

    // Masquer le loading
    //NOTE: cette ligne a ete deplace tout en bas pour assure que tout est bien charge
    // document.getElementById('loading').style.display = 'none';
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    showError();
  }

  // Ajout de l'écouteur pour le bouton de rechargement
  const reloadButton = document.getElementById('reloadAllTabs');
  if (reloadButton) {
    reloadButton.addEventListener('click', reloadAllTabs);
  }

});

//gerer les paramètres de l'extension
document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});



// Écouteurs d'événements pour les switches
for (const elementId of Object.keys(settingsMappings)) {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener('change', async (event) => {

      const setting = settingsMappings[elementId];
      const value = event.target.checked;
      // Mise à jour de l'état local
      currentSettings[setting] = value;
      updateStatus();

      try {
        // Envoi du changement au background script
        await chrome.runtime.sendMessage({
          type: 'updateSetting',
          setting,
          value
        });

      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showError();
        event.target.checked = !value; // Rétablir l'état précédent
      }
    });
  }
}



// Mise à jour de l'interface utilisateur
function updateInterface(settings) {
  currentSettings = settings;

  // Mise à jour des switches
  for (const [elementId, settingKey] of Object.entries(settingsMappings)) {
    const element = document.getElementById(elementId);
    if (element) {
      element.checked = settings[settingKey];
    }
  }

  // Mise à jour du statut
  updateStatus();
}


// Fonction pour mettre à jour l'état du statut
function updateStatus() {
  const statusElement = document.getElementById('status');
  const statusTextElement = document.getElementById('statusText');

  const stats = {
    spoofNavigator: currentSettings.spoofNavigator,
    spoofUserAgent: currentSettings.spoofUserAgent,
    spoofCanvas: currentSettings.spoofCanvas,
    blockImages: currentSettings.blockImages,
    blockJS: currentSettings.blockJS
  };

  const mergedStats = { ...stats };
  const isAnyProtectionEnabled = Object.values(mergedStats).some(value => value);

  if (isAnyProtectionEnabled) {
    // Protection active
    statusElement.classList.remove('inactive');
    statusElement.classList.add('active');
    statusTextElement.textContent = 'Protection active';
  } else {
    // Protection inactive
    statusElement.classList.remove('active');
    statusElement.classList.add('inactive');
    statusTextElement.textContent = 'Protection inactive';
  }
}

// Gestion des erreurs
function showError() {
  const statusElement = document.getElementById('status');
  const statusTextElement = document.getElementById('statusText');

  //mettre la protection inactive avec un message d'erreur
  statusElement.classList.remove('active');
  statusElement.classList.add('inactive');
  statusTextElement.textContent = 'Erreur de connexion';
}



// Fonction pour recharger tous les onglets
async function reloadAllTabs() {
  const button = document.getElementById('reloadAllTabs');

  try {
    // Désactiver le bouton et montrer l'état de chargement
    button.disabled = true;
    button.classList.add('loading');

    // Récupérer tous les onglets
    const tabs = await chrome.tabs.query({});

    // Recharger chaque onglet
    for (const tab of tabs) {
      if (!tab.url.startsWith('chrome://')) {
        try {
          await chrome.tabs.reload(tab.id);
        } catch (error) {
          console.error(`Erreur lors du rechargement de l'onglet ${tab.id}:`, error);
        }
      }
    }

    // Feedback visuel temporaire
    button.textContent = 'Pages rechargées !';
    setTimeout(() => {
      button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recharger toutes les pages
            `;
      button.disabled = false;
      button.classList.remove('loading');
    }, 2000);

  } catch (error) {
    console.error('Erreur lors du rechargement des onglets:', error);
    button.textContent = 'Erreur lors du rechargement';
    setTimeout(() => {
      button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recharger toutes les pages
            `;
      button.disabled = false;
      button.classList.remove('loading');
    }, 2000);
  }
}

// setTimeout(() => {
document.getElementById('loading').style.display = 'none';
// }, 313);
// document.getElementById('loading').style.display = 'none';

