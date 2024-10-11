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
  uaPlatform: 'random',
  uaPlatformVersion: 'random',
  uaArchitecture: 'random',
  uaBitness: 'random',
  uaWow64: 'random',
  uaModel: 'random',
  uaFullVersion: 'random',
  browser: 'random',
  secChUa: 'random',
  secChUaMobile: 'random',
  secChUaPlatform: 'random',
  secChUaFullVersion: 'random',
  secChUaPlatformVersion: 'random',
  hDeviceMemory: 'random',
  contentEncoding: 'random',
  useFixedProfile: false,
  generateNewProfileOnStart: false,
  activeProfileId: null
};

const navigatorFields = [
  'platform', 'language', 'hardwareConcurrency',
  'deviceMemory', 'minVersion', 'maxVersion',
];

const uaFields = [
  'uaPlatform', 'uaPlatformVersion', 'uaArchitecture',
  'uaBitness', 'uaWow64', 'uaModel', 'uaFullVersion'
];

const browserHeaders = [
  'browser', 'secChUa', 'secChUaMobile',
  'secChUaPlatform', 'secChUaFullVersion',
  'secChUaPlatformVersion',
  'hDeviceMemory',
  'contentEncoding'
];

let profiles = {};
let currentProfile = null;
let currentSettings = { ...defaultSettings };

// Éléments du DOM
const autoReloadAllCheckbox = document.getElementById('autoReloadAll');
const autoReloadCurrentCheckbox = document.getElementById('autoReloadCurrent');
const saveButton = document.getElementById('saveButton');
const saveStatus = document.getElementById('saveStatus');
const useFixedProfileCheckbox = document.getElementById('useFixedProfile');
const generateNewProfileCheckbox = document.getElementById('generateNewProfileOnStart');
const activeProfileSelect = document.getElementById('activeProfile');
const newProfileButton = document.getElementById('newProfile');
const deleteProfileButton = document.getElementById('deleteProfile');
const profileInfoDiv = document.getElementById('profileInfo');
const activateProfile = document.getElementById('activateProfile');

// Chargement des paramètres au démarrage
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const storedSettings = await chrome.storage.sync.get(Object.keys(defaultSettings));
    currentSettings = { ...defaultSettings, ...storedSettings };

    const storedProfiles = await chrome.storage.local.get('profiles');
    profiles = storedProfiles.profiles || {};

    // Créer un nouveau profil si nécessaire
    if (currentSettings.useFixedProfile && Object.keys(profiles).length === 0 && currentSettings.generateNewProfileOnStart) {
      await createNewProfile();
    }

    updateProfilesInterface();
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

  const allFields = [...navigatorFields, ...uaFields, ...browserHeaders];
  allFields.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      element.value = currentSettings[field];
    } else {
      console.error(`Élément ${field} introuvable`);
    }
  });
}

// Mise à jour de l'interface des profils
function updateProfilesInterface() {
  activeProfileSelect.innerHTML = '';
  Object.entries(profiles).forEach(([id, profile]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `Profil ${id.slice(-4)} - ${profile.fakeNavigator.platform}`;
    activeProfileSelect.appendChild(option);
  });

  if (currentSettings.activeProfileId && profiles[currentSettings.activeProfileId]) {
    activeProfileSelect.value = currentSettings.activeProfileId;
    showProfileDetails(profiles[currentSettings.activeProfileId]);
  }

  useFixedProfileCheckbox.checked = currentSettings.useFixedProfile;
  generateNewProfileCheckbox.checked = currentSettings.generateNewProfileOnStart;
  activeProfileSelect.disabled = !currentSettings.useFixedProfile;
  deleteProfileButton.disabled = !currentSettings.useFixedProfile;

  const activeProfileNameText =
    profiles[currentSettings.activeProfileId] ? `Profil ${profiles[currentSettings.activeProfileId].id.slice(-4)}` : 'Aucun';
  document.getElementById('activeProfileName').textContent = activeProfileNameText;
}

// Afficher les détails du profil
function showProfileDetails(profile) {
  if (!profile) {
    profileInfoDiv.style.display = 'none';
    return;
  }

  document.getElementById('profileCreated').textContent = new Date(profile.createdAt).toLocaleString();
  document.getElementById('profilePlatform').textContent = profile.fakeNavigator.platform;
  document.getElementById('profileLanguage').textContent = profile.fakeNavigator.language;
  document.getElementById('profileBrowser').textContent = profile.fakeUserAgentData.browserVersion;
  document.getElementById('profileHardware').textContent =
    `${profile.fakeNavigator.hardwareConcurrency} cores, ${profile.fakeNavigator.deviceMemory}GB RAM`;

  profileInfoDiv.style.display = 'block';
}

async function deleteProfile() {
  const profileId = activeProfileSelect.value;
  if (profileId) {
    delete profiles[profileId];
    await chrome.storage.local.set({ profiles });
    updateProfilesInterface();
    showStatus('Profil supprimé', 'success');
  }
}

async function createNewProfile() {
  try {
    const newProfile = await chrome.runtime.sendMessage({ type: 'generateNewProfile' });
    profiles[newProfile.id] = newProfile;

    await chrome.storage.local.set({ profiles });
    updateProfilesInterface();
    showStatus('Nouveau profil créé', 'success');
  } catch (error) {
    console.error('Erreur lors de la création du profil:', error);
    showStatus('Erreur lors de la création du profil', 'error');
  }
}

// Gestionnaires d'événements pour les nouveaux contrôles
useFixedProfileCheckbox.addEventListener('change', async (e) => {
  currentSettings.useFixedProfile = e.target.checked;
  await chrome.storage.sync.set({ useFixedProfile: e.target.checked });

  if (e.target.checked && Object.keys(profiles).length === 0) {
    await createNewProfile();
  }

  updateProfilesInterface();
});

generateNewProfileCheckbox.addEventListener('change', async (e) => {
  currentSettings.generateNewProfileOnStart = e.target.checked;
  await chrome.storage.sync.set({ generateNewProfileOnStart: e.target.checked });
});

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
    platform: document.getElementById('platform').value,
    language: document.getElementById('language').value,
    hardwareConcurrency: parseInt(document.getElementById('hardwareConcurrency').value) || 0,
    deviceMemory: parseInt(document.getElementById('deviceMemory').value) || 0,
    minVersion: parseInt(document.getElementById('minVersion').value) || 0,
    maxVersion: parseInt(document.getElementById('maxVersion').value) || 0,
    uaPlatform: document.getElementById('uaPlatform').value || 'random',
    uaPlatformVersion: document.getElementById('uaPlatformVersion').value || 'random',
    uaArchitecture: document.getElementById('uaArchitecture').value,
    uaBitness: document.getElementById('uaBitness').value,
    uaWow64: document.getElementById('uaWow64').value,
    uaModel: document.getElementById('uaModel').value || 'random',
    uaFullVersion: document.getElementById('uaFullVersion').value,
    browser: document.getElementById('browser').value,
    hDeviceMemory: document.getElementById('hDeviceMemory').value,
    secChUa: document.getElementById('secChUa').value,
    secChUaMobile: document.getElementById('secChUaMobile').value,
    secChUaPlatform: document.getElementById('secChUaPlatform').value,
    secChUaFullVersion: document.getElementById('secChUaFullVersion').value,
    contentEncoding: document.getElementById('contentEncoding').value,
    useFixedProfile: useFixedProfileCheckbox.checked,
    generateNewProfileOnStart: generateNewProfileCheckbox.checked,
    activeProfileId: currentSettings.activeProfileId
  };

  try {
    await chrome.storage.sync.set(newSettings);
    currentSettings = { ...newSettings };
    showStatus('Paramètres enregistrés avec succès', 'success');

    await chrome.runtime.sendMessage({
      type: 'updateSetting',
      settings: newSettings
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des paramètres:", error);
    showStatus("Erreur lors de l'enregistrement des paramètres", "error");
  }
});

// Affichage du statut
function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = type;
  saveStatus.style.display = "block";

  setTimeout(() => {
    saveStatus.style.display = "none";
  }, 3000);
}

// Gestionnaires d'événements pour les boutons de profil
newProfileButton.addEventListener("click", createNewProfile);
deleteProfileButton.addEventListener("click", deleteProfile);

// Activation du profil sélectionné
activateProfile.addEventListener("click", async () => {
  const profileId = activeProfileSelect.value;
  if (profileId) {
    try {
      await chrome.storage.local.set({ activeProfileId: profileId });
      currentSettings.activeProfileId = profileId; // Met à jour les paramètres actifs
      updateProfilesInterface(); // Met à jour l'interface des profils
      showStatus("Profil activé", "success");
    } catch (error) {
      console.error("Erreur lors de l'activation du profil:", error);
      showStatus("Erreur lors de l'activation du profil", "error");
    }
  } else {
    showStatus("Aucun profil sélectionné", "error");
  }
});
