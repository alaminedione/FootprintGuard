// Paramètres par défaut
const defaultSettings = {
  autoReloadAll: false,
  autoReloadCurrent: false,
  platform: 'random',
  language: 'random',
  hardwareConcurrency: 0,
  deviceMemory: 0,
  minVersion: 0,
  maxVersion: 0,

  //
  uaPlatform: 'random',
  uaPlatformVersion: 'random',
  uaArchitecture: 'random',
  uaBitness: 'random',
  uaWow64: 'random',
  uaModel: 'random',
  uaFullVersion: 'random',
  //
  browser: 'random',
  secChUa: 'random',
  secChUaMobile: 'random',
  secChUaPlatform: 'random',
  secChUaFullVersion: 'random',
  secChUaPlatformVersion: 'random',
  hDeviceMemory: 'random',
  // referer: '', // Valeur vide pour le referer
  contentEncoding: 'random'

};

const navigatorFields = [
  'platform', 'language', 'hardwareConcurrency',
  'deviceMemory', 'minVersion', 'maxVersion'
];

const uaFields = [
  'uaPlatform', 'uaPlatformVersion', 'uaArchitecture', 'uaBitness', 'uaWow64', 'uaModel', 'uaFullVersion'
];

const browserHeaders = [
  'browser', 'secChUa', 'secChUaMobile', 'secChUaPlatform', 'secChUaFullVersion', 'secChUaPlatformVersion', 'hDeviceMemory', 'contentEncoding'
];

// État des paramètres actuels
let currentSettings = { ...defaultSettings };

// Éléments du DOM
const autoReloadAllCheckbox = document.getElementById('autoReloadAll');
const autoReloadCurrentCheckbox = document.getElementById('autoReloadCurrent');
const saveButton = document.getElementById('saveButton');
const saveStatus = document.getElementById('saveStatus');

// Chargement des paramètres au démarrage
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const stored = await chrome.storage.sync.get(Object.keys(defaultSettings));
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
  navigatorFields.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      const value = currentSettings[field];
      // Vérification de la validité de la valeur
      element.value = value;
    } else {
      console.error(`Élément ${field} introuvable`);
    }
  });

  // Affichage des paramètres du UserAgentData
  uaFields.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      element.value = currentSettings[field];
    } else {
      console.error(`Élément ${field} introuvable`);
    }
  });

  //afficher des parametre browserHeaders
  browserHeaders.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      element.value = currentSettings[field];
    } else {
      console.error(`Élément ${field} introuvable`);
    }
  });

}

// Gestion des événements de changement de valeur des switches
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
    //
    platform: document.getElementById('platform').value,
    language: document.getElementById('language').value,
    hardwareConcurrency: parseInt(document.getElementById('hardwareConcurrency').value),
    deviceMemory: parseInt(document.getElementById('deviceMemory').value),
    minVersion: parseInt(document.getElementById('minVersion').value),
    maxVersion: parseInt(document.getElementById('maxVersion').value),
    //
    uaPlatform: document.getElementById('uaPlatform').value === '' ? 'random' : document.getElementById('uaPlatform').value,
    uaPlatformVersion: document.getElementById('uaPlatformVersion').value === '' ? 'random' : document.getElementById('uaPlatformVersion').value,
    uaArchitecture: document.getElementById('uaArchitecture').value,
    uaBitness: document.getElementById('uaBitness').value,
    uaWow64: document.getElementById('uaWow64').value,
    uaModel: document.getElementById('uaModel').value === '' ? 'random' : document.getElementById('uaModel').value,
    uaFullVersion: document.getElementById('uaFullVersion').value,
    //
    browser: document.getElementById('browser').value,
    hDeviceMemory: document.getElementById('hDeviceMemory').value,
    secChUa: document.getElementById('secChUa').value,
    secChUaMobile: document.getElementById('secChUaMobile').value,
    secChUaPlatform: document.getElementById('secChUaPlatform').value,
    secChUaFullVersion: document.getElementById('secChUaFullVersion').value,
    contentEncoding: document.getElementById('contentEncoding').value,
    // referer: document.getElementById('referer').value === '' ? 'random' : '' //element ne figure pas encore sur la dom
  };


  try {
    // Sauvegarde des paramètres
    await chrome.storage.sync.set(newSettings);
    currentSettings = { ...newSettings };
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

