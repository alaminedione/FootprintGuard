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
  activeProfileId: null,
  profiles: []
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
  'secChUaPlatformVersion', 'hDeviceMemory',
  // 'contentEncoding'
];

let currentProfiles = []; // Stockage des profils sous forme de tableau
let currentProfile = null;
let settings = { ...defaultSettings };

//charger les profiles stockés
async function getProfilesFromStockage() {
  const profiles = await chrome.runtime.sendMessage({ type: 'getProfiles' })
  return profiles || []
}
async function getSettingFromStockage() {
  const settings = chrome.runtime.sendMessage({ type: 'getSettings' })
  return settings
}

async function getActiveProfileFromStockage() {
  const activeProfileId = await chrome.runtime.sendMessage({ type: 'getActiveProfileId' });
  return activeProfileId || null
}


// DOM Elements
const autoReloadAllCheckbox = document.getElementById('autoReloadAll');
const autoReloadCurrentCheckbox = document.getElementById('autoReloadCurrent');
const saveButton = document.getElementById('saveButton');
const saveStatus = document.getElementById('saveStatus');
//
const useFixedProfileCheckbox = document.getElementById('useFixedProfile');
const generateNewProfileCheckbox = document.getElementById('generateNewProfileOnStart');
const profiles = document.getElementById('profiles');
const btnNewProfile = document.getElementById('newProfile');
const btnDeleteProfile = document.getElementById('deleteProfile');
const btnActivateProfile = document.getElementById('activateProfile');
const activeProfile = document.getElementById('activeProfile');

//active profile info
const profileCreated = document.getElementById('profileCreated');
const profilePlatform = document.getElementById('profilePlatform');
const profileLanguage = document.getElementById('profileLanguage');
const profileBrowser = document.getElementById('profileBrowser');
const profileHardware = document.getElementById('profileHardware');

// Load settings on startup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentProfiles = await getProfilesFromStockage()
    console.log('profiles chargés:', currentProfiles);

    //charger les paramètres
    settings = await getSettingFromStockage();
    console.log('settings chargés:', settings);

    //charger le profile actif
    settings.activeProfileId = await getActiveProfileFromStockage();
    console.log('activeProfileId chargé :' + settings.activeProfileId);
    if (settings.activeProfileId) {
      currentProfile = getProfileById(settings.activeProfileId);
      if (!currentProfile) {
        //le profil actif n'existe plus
        currentProfile = null
        settings.activeProfileId = null
        chrome.storage.sync.set({ activeProfileId: null }, () => {
          console.log('activeProfileId mis à null');
        });
      }
      console.log('profile actif chargé :' + currentProfile + 'avec id : ' + settings.activeProfileId);
    } else {
      currentProfile = null; // Profil non trouvé
      console.log('aucun profile actif trouvé');
    }

    updateInterface();
    showStatus('Settings loaded', 'success');
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
});

//enregistrer les paramètres settings
saveButton.addEventListener('click', async () => {
  const settingsToUpdate = getSettingsFromUI();
  console.log('settings to update : ', settingsToUpdate);
  const result = chrome.runtime.sendMessage({ type: 'updateSettings', settings: settingsToUpdate });
  console.log('result  de la sauvegarde : ', result);
  settings = { ...settingsToUpdate }
  if (result) {
    showStatus('Settings saved', 'success');
  } else {
    showStatus('Error saving settings', 'error');
  }
})

//ecouteurs d'evenements
btnNewProfile.addEventListener('click', createNewProfile);
btnDeleteProfile.addEventListener('click', deleteProfile);
btnActivateProfile.addEventListener('click', activateProfile);

//fonctions get all settings from ui
function getSettingsFromUI() {
  const settings = {
    autoReloadAll: autoReloadAllCheckbox.checked,
    autoReloadCurrent: autoReloadCurrentCheckbox.checked,
    useFixedProfile: useFixedProfileCheckbox.checked,
    generateNewProfileOnStart: generateNewProfileCheckbox.checked,
    activeProfileId: currentProfile ? currentProfile.id : null,
    platform: platform.value === '' ? 'random' : platform.value,
    language: language.value === '' ? 'random' : language.value,
    hardwareConcurrency: hardwareConcurrency.value === '' ? 0 : parseInt(hardwareConcurrency.value, 10), // Parse as int
    deviceMemory: deviceMemory.value === '' ? 0 : parseInt(deviceMemory.value, 10), // Parse as int
    minVersion: minVersion.value === '' ? 0 : parseInt(minVersion.value, 10), // Parse as int
    maxVersion: maxVersion.value === '' ? 0 : parseInt(maxVersion.value, 10), // Parse as int
    uaPlatform: uaPlatform.value === '' ? 'random' : uaPlatform.value,
    uaPlatformVersion: uaPlatformVersion.value === '' ? 'random' : uaPlatformVersion.value,
    uaArchitecture: uaArchitecture.value === '' ? 'random' : uaArchitecture.value,
    uaBitness: uaBitness.value === '' ? 'random' : uaBitness.value,
    uaWow64: uaWow64.value === '' ? 'random' : uaWow64.value,
    uaModel: uaModel.value === '' ? 'random' : uaModel.value,
    uaFullVersion: uaFullVersion.value === '' ? 'random' : uaFullVersion.value,
    browser: browser.value === '' ? 'random' : browser.value,
    secChUa: secChUa.value === '' ? 'random' : secChUa.value,
    secChUaMobile: secChUaMobile.value === '' ? 'random' : secChUaMobile.value,
    secChUaPlatform: secChUaPlatform.value === '' ? 'random' : secChUaPlatform.value,
    secChUaFullVersion: secChUaFullVersion.value === '' ? 'random' : secChUaFullVersion.value,
    secChUaPlatformVersion: secChUaPlatformVersion.value === '' ? 'random' : secChUaPlatformVersion.value,
    hDeviceMemory: hDeviceMemory.value === '' ? 0 : parseInt(hDeviceMemory.value, 10), // Parse as int
    // contentEncoding: contentEncoding.value === '' ? 'random' : contentEncoding.value,
    profiles: currentProfiles || []
  };

  return settings;
}
// Utilitaire pour obtenir un profil par ID
function getProfileById(profileId) {
  if (profileId) {
    if (currentProfiles.length > 0) {
      return currentProfiles.find(profile => profile.id === profileId);
    } else {
      return null;
    }
  }
}

function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = type;
  saveStatus.style.display = "block";

  setTimeout(() => {
    saveStatus.style.display = "none";
  }, 3000);
}

function updateInterface() {
  autoReloadAllCheckbox.checked = settings.autoReloadAll;
  autoReloadCurrentCheckbox.checked = settings.autoReloadCurrent;

  const allFields = [...navigatorFields, ...uaFields, ...browserHeaders];
  allFields.forEach(field => {
    const element = document.getElementById(field);
    const value = settings[field] !== undefined ? settings[field] : defaultSettings[field];
    // const value = settings[field];
    if (element) {
      element.value = value;
      console.log('Element updated in interface:', element);
    } else {
      console.error(`Element ${field} not found`);
    }
  });
  // Update section profiles
  useFixedProfileCheckbox.checked = settings.useFixedProfile;
  generateNewProfileCheckbox.checked = settings.generateNewProfileOnStart;
  profiles.innerHTML = '';
  if (currentProfiles.length > 0) {
    currentProfiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = `Profile ${profile.id.slice(-4)} - ${profile.fakeNavigator.platform}`;
      profiles.appendChild(option);
    });
  } else {
    profiles.appendChild(document.createTextNode('No profiles'));
  }

  //
  activeProfile.textContent = currentProfile ? `Profile ${currentProfile.id.slice(-4)} - ${currentProfile.fakeNavigator.platform}` : 'No profile activated';

  // Update section profile details
  profileCreated.textContent = currentProfile ? currentProfile.createdAt : ''
  profilePlatform.textContent = currentProfile ? currentProfile.fakeNavigator.platform : ''
  profileLanguage.textContent = currentProfile ? currentProfile.fakeNavigator.language : ''
  profileBrowser.textContent = currentProfile ? currentProfile.fakeNavigator.browser : ''
  profileHardware.textContent = currentProfile ? currentProfile.fakeNavigator.hardwareConcurrency : ''
}


//create new profile
async function createNewProfile() {
  const newProfile = await chrome.runtime.sendMessage({ type: 'generateNewProfile' });
  currentProfiles.push(newProfile);
  updateInterface();
  showStatus('New profile created', 'success');
}
//delete profile
async function deleteProfile() {
  const selectedProfile = profiles.value
  const result = await chrome.runtime.sendMessage({ type: 'deleteProfile', id: selectedProfile });
  if (result) {
    currentProfiles.splice(currentProfiles.findIndex(profile => profile.id === selectedProfile), 1);
    updateInterface();
    showStatus('Profile deleted', 'success');
  }
}
//activate profile
async function activateProfile() {
  const selctedProfileID = profiles.value
  console.log('selctedProfileID : ', selctedProfileID);
  const selectedProfile = getProfileById(selctedProfileID);
  console.log('selected Profile : ', selectedProfile);
  if (selectedProfile) {
    currentProfile = { ...selectedProfile };
    settings.activeProfileId = selctedProfileID;
    console.log('active profile id mis a: ', settings.activeProfileId);
    await chrome.runtime.sendMessage({ type: 'updateSetting', setting: 'activeProfileId', value: selctedProfileID });
    console.log('current profile modified succesfully : ', currentProfile);
    updateInterface();
    showStatus('Profile activated', 'success');
  }
}

