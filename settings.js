
// Paramètres par défaut
const defaultSettings = {
  // Paramètres de l'extension
  autoReloadAll: false,
  autoReloadCurrent: false,
  // Paramètres du Navigator spoofing
  // platform: 'random',
  // language: 'random',
  // hardwareConcurrency: 4,
  // deviceMemory: 8,
  // minVersion: 110,
  // maxVersion: 120
};

// const navigatorFields = [
//   'platform', 'language', 'hardwareConcurrency',
//   'deviceMemory', 'minVersion', 'maxVersion'
// ];

// État des paramètres actuels
let currentSettings = { ...defaultSettings };

// Éléments du DOM
const autoReloadAllCheckbox = document.getElementById('autoReloadAll');
const autoReloadCurrentCheckbox = document.getElementById('autoReloadCurrent');
const saveButton = document.getElementById('saveButton');
const saveStatus = document.getElementById('saveStatus');

// Chargement des paramètres au démarrage
document.addEventListener('DOMContentLoaded', async () => {
  // Chargement des paramètres depuis le storage
  try {
    const stored = await chrome.storage.sync.get(defaultSettings);
    currentSettings = { ...defaultSettings, ...stored };
    updateInterface();
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres:', error);
    showStatus('Erreur lors du chargement des paramètres', 'error');
  }

});

// Mise à jour de l'interface utilisateur
function updateInterface() {
  autoReloadAllCheckbox.checked = currentSettings.autoReloadAll;
  autoReloadCurrentCheckbox.checked = currentSettings.autoReloadCurrent;

  // Affichage des paramètres du Navigator
  // navigatorFields.forEach(field => {
  //   const element = document.getElementById(field);
  //   if (element) {
  //     element.value = currentSettings[field];
  //   } else {
  //     console.error(`Élément ${field} introuvable`);
  //   }
  // });
}

// Gestion des événements de changement de valeur des swictches autoReloadAll et autoReloadCurrent
autoReloadAllCheckbox.addEventListener('change', (e) => {
  if (e.target.checked && autoReloadCurrentCheckbox.checked) {
    autoReloadCurrentCheckbox.checked = false;
  }
});
autoReloadCurrentCheckbox.addEventListener('change', (e) => {
  if (e.target.checked && autoReloadAllCheckbox.checked) {
    autoReloadAllCheckbox.checked = false;
  }
});

// Enregistrement des paramètres
saveButton.addEventListener('click', async () => {
  const newSettings = {
    autoReloadAll: autoReloadAllCheckbox.checked,
    autoReloadCurrent: autoReloadCurrentCheckbox.checked,
    // platform: document.getElementById('platform').value,
    // language: document.getElementById('language').value,
    // hardwareConcurrency: parseInt(document.getElementById('hardwareConcurrency').value),
    // deviceMemory: parseInt(document.getElementById('deviceMemory').value),
    // minVersion: parseInt(document.getElementById('minVersion').value),
    // maxVersion: parseInt(document.getElementById('maxVersion').value)
  };

  try {
    // Sauvegarde des paramètres
    await chrome.storage.sync.set(newSettings);
    // // attendre 3 secondes le temps d'afficher le message de status, sinon la page se recharge automatiquement suite au evenement de changement de parametre
    // setTimeout(() => {
    //   console.log('sauvegarde des parametres...');
    // }, 3000);
    //
    currentSettings = newSettings;
    showStatus('Paramètres enregistrés avec succès', 'success');
    // Notification au background script
    await chrome.runtime.sendMessage({
      type: 'updateSetting',
      settings: newSettings
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des paramètres:', error);
    showStatus('Erreur lors de l\'enregistrement des paramètres', 'error');
  }



});

// Affichage du statut
function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = type;
  saveStatus.style.display = 'block';

  setTimeout(() => {
    saveStatus.style.display = 'none';
  }, 3000);
}

