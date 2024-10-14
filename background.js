// Configuration par défaut
const defaultSettings = {
  ghostMode: false,
  spoofNavigator: false,
  spoofUserAgent: false,
  spoofCanvas: false,
  blockImages: false,
  blockJS: false,
  //
  autoReloadAll: false,
  autoReloadCurrent: false,
  //
  platform: 'random',
  language: 'random',
  // navSpoofBrowser: 'random',
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
  hDeviceMemory: 0,
  referer: '',
  contentEncoding: 'random',
  //
  useFixedProfile: false,
  activeProfileId: null,
  generateNewProfileOnStart: false,
  //
  profiles: []
};


// Structure pour stocker les profils
let profiles = [];
let currentProfile = null;

let settings = { ...defaultSettings };

// Initialisation
async function initialize() {
  //charger les paramètres
  const stored = await chrome.storage.sync.get(Object.keys(defaultSettings));
  settings = { ...defaultSettings, ...stored };

  // Charger les profils existants
  const storedProfiles = await chrome.storage.local.get('profiles');
  profiles = storedProfiles.profiles || [];

  // Charger le profil actif
  if (settings.activeProfileId) {
    currentProfile = getProfileById(settings.activeProfileId);
    if (!currentProfile) {
      //le profil actif n'existe plus, peut etre qu'il a ete supprimé
      currentProfile = null
      settings.activeProfileId = null
      chrome.storage.sync.set({ activeProfileId: null }, () => {
        console.log('activeProfileId mis à null ', settings.activeProfileId);
      });
    }
  } else {
    currentProfile = null;
  }

  // Gérer le profil actif
  if (settings.useFixedProfile) {
    if (settings.generateNewProfileOnStart) {
      if (!currentProfile) {
        currentProfile = generateNewProfile();
        settings.activeProfileId = currentProfile.id;
        await saveProfile(currentProfile);
      }
    } else if (settings.activeProfileId) {
      currentProfile = getProfileById(settings.activeProfileId);
    }
    if (!currentProfile) {
      currentProfile = generateNewProfile();
      settings.activeProfileId = currentProfile.id;
      await saveProfile(currentProfile);
    }
  }

  console.log('settings loaded:', settings);
  console.log('currentProfile loaded:', currentProfile);
}

initialize();

function generateNewProfile() {
  const profile = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    fakeNavigator: getFakeNavigatorProperties(settings),
    fakeUserAgentData: getFakeUserAgentData(settings),
    fakeUserAgent: getFakeUserAgent(settings),
    rules: getNewRules(settings, 1),
  };

  return profile;
}


// Sauvegarde d'un profil
async function saveProfile(profile) {
  profiles.push(profile);
  await chrome.storage.local.set({ profiles });
}

// Fonction pour obtenir un profil par ID
function getProfileById(profileId) {
  return profiles.find(profile => profile.id === profileId);
}

// Obtention des valeurs de configuration
function getConfigValue(key) {
  if (settings.useFixedProfile && currentProfile) {
    return currentProfile.properties[key] || settings[key];
  }
  return settings[key];
}


// Écoute des changements de paramètres
chrome.storage.onChanged.addListener((changes) => {
  for (let [key, { newValue }] of Object.entries(changes)) {
    // Mettre à jour les valeurs de settings
    settings[key] = newValue;

    // Si on change de profil actif
    if (key === 'activeProfileId' && settings.useFixedProfile) {
      const newProfileId = newValue;
      currentProfile = getProfileById(newProfileId); // Utiliser la fonction pour obtenir le profil

      if (currentProfile) {
        console.log(`activeProfileId: ${currentProfile.id}`);
      } else {
        currentProfile = generateNewProfile();
        settings.activeProfileId = currentProfile.id;
        saveProfile(currentProfile);
      }
    }

    console.log(`paramètres modifiés: ${key} = ${newValue}`);
  }
  handleAutoReload();
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getStatus':
      sendResponse(settings);
      console.log('Status envoyé:', settings);
      break;

    case 'updateSetting': {
      const { setting, value } = message;
      settings[setting] = value;

      chrome.storage.sync.set({ [setting]: value }, () => {
        console.log(`Paramètre ${setting} mis à ${value}`);
      });
      sendResponse({ success: true });
      break;
    }

    case 'updateSettings': {
      const msg_settings = message.settings;
      Object.keys(msg_settings).forEach(key => {
        settings[key] = msg_settings[key];
        chrome.storage.sync.set({ [key]: msg_settings[key] }, () => {
          console.log(`Paramètre ${key} mis à ${msg_settings[key]}`);
        });
      });
      sendResponse({ success: true });
      break;
    }

    case 'generateNewProfile': {
      const newProfile = generateNewProfile();
      profiles.push(newProfile);
      chrome.storage.local.set({ profiles }, () => {
        console.log('Profil enregistré:', newProfile);
      });
      sendResponse(newProfile);
      break;
    }

    case 'getProfiles':
      sendResponse(profiles);
      console.log('Profils envoyés:', profiles);
      break;

    case 'getActiveProfileId':
      sendResponse(settings.activeProfileId);
      console.log('ID du profil actif envoyé:', settings.activeProfileId);
      break;

    case 'deleteProfile': {
      const profileIndex = profiles.findIndex(profile => profile.id === message.id);
      if (profileIndex > -1) {
        profiles.splice(profileIndex, 1);
        chrome.storage.local.set({ profiles }, () => {
          console.log('Profil supprimé:', message.id);
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Profil non trouvé' });
      }
      break;
    }
    case 'getSettings':
      sendResponse(settings);
      console.log('Settings envoyés:', settings);
      break;

    default:
      console.warn('Type de message non reconnu:', message.type);
      sendResponse({ success: false, error: 'Type de message non reconnu' });
  }
  // return true; // Indicate that the response will be sent asynchronously
});

// Écoute les navigations et injecte les scripts
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.url.startsWith('chrome://') || details.url.startsWith("chrome-extension://")) {
    return;
  }

  console.log('navigation vers: ', details.url);

  if (settings.ghostMode) {
    console.log('activation ghost mode sur  la page: ', details.url);
    applyGhostMode(details.tabId);
    return;
  } else {
    //make sure that we remove rule 999
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [999],
    });
  }


  if (settings.spoofCanvas) {
    console.log('activation spoof canvas sur  la page: ', details.url);
    injectScript(details.tabId, './spoofer/spoof-canvas.js');
  }

  if (settings.spoofNavigator) {
    console.log('activation spoof navigator sur  la page: ', details.url);
    spoofNavigator(details.tabId, settings);
  }

  if (settings.spoofUserAgent) {
    console.log('activation spoof user agent sur  la page: ', details.url);
    spoofUserAgent(details.tabId, settings);
  } else {
    //desactive le rule id 1
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1]
    })
  }
})

// Gérer le blocage des images et des scripts
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.url.startsWith('chrome://') || details.url.startsWith("chrome-extension://")) {
    return;
  }
  console.log('navigation vers: ', details.url);

  chrome.contentSettings.javascript.set({
    primaryPattern: '<all_urls>',
    setting: settings.blockJS ? 'block' : 'allow'
  });
  console.log('block js: ', settings.blockJS);

  chrome.contentSettings.images.set({
    primaryPattern: '<all_urls>',
    setting: settings.blockImages ? 'block' : 'allow'
  });
  console.log('block images: ', settings.blockImages);
});

// Gérer le rechargement automatique des pages
async function handleAutoReload() {
  const { autoReloadAll, autoReloadCurrent } = await chrome.storage.sync.get(['autoReloadAll', 'autoReloadCurrent']);
  if (autoReloadAll) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        await chrome.tabs.reload(tab.id);
        console.log('rechargement automatique: ', tab.url);
      }
    }
  } else if (autoReloadCurrent) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('chrome-extension://')) {
      await chrome.tabs.reload(activeTab.id);
      console.log('rechargement automatique: ', activeTab.url);
    }
  }
}

// Fonctions de spoofing
function spoofNavigator(tabId, config) {
  const fakeNavigator = settings.useFixedProfile && currentProfile
    ? getFakeNavigatorPropertiesFromProfile(currentProfile)
    : getFakeNavigatorProperties(config);

  const fakeUserAgentData = settings.useFixedProfile && currentProfile
    ? getFakeUserAgentDataFromProfile(currentProfile)
    : getFakeUserAgentData(config);

  console.log('Usurpation de la navigation sur la page');
  injectScript(tabId, applySpoofingNavigator, fakeNavigator);
  injectScript(tabId, applyUserAgentData, fakeUserAgentData);
}


function getFakeNavigatorPropertiesFromProfile(profile) {
  return profile.fakeNavigator;
}

function getFakeUserAgentDataFromProfile(profile) {
  return profile.fakeUserAgentData;
}

function getRulesFromProfiles(profile) {
  return profile.rules
}
function getFakeUserAgentFromProfile(profile) {
  return profile.fakeUserAgent
}

function spoofUserAgent(tabId, config) {
  const newRule = settings.activeProfileId && currentProfile ? getRulesFromProfiles(currentProfile) : getNewRules(config, 1); // 1 est un ID de règle unique
  console.log('usurpation de l\'user agent sur la page: ');
  // const newRule = getNewRules(config, 1); // 1 est un ID de règle unique
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: newRule,
  });
  console.log('injection de  l\'script de modification de user agent');
  if (!settings.spoofNavigator) {
    const fakeUserAgent = settings.activeProfileId && currentProfile
      ? getFakeUserAgentFromProfile(currentProfile)
      : getFakeUserAgent(settings);
    console.log('iniatilisation de l\'injection de script de modification de user agent  avec comme args : ', fakeUserAgent);
    console.log('le profile actuel est : ', currentProfile);
    injectScript(tabId, applyUserAgent, fakeUserAgent);
  }
}

function injectScript(tabId, fileOrFunc, args) {
  console.log('injection de script de modification de user agent');
  chrome.scripting.executeScript({
    world: 'MAIN',
    injectImmediately: true,
    target: { tabId },
    files: typeof fileOrFunc === 'string' ? [fileOrFunc] : undefined,
    func: typeof fileOrFunc === 'function' ? fileOrFunc : undefined,
    args: [args]
  });
}



//fonction qui applique ghostMode
function applyGhostMode(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    injectImmediately: true,
    world: 'MAIN',
    func: () => {
      const makeUndefined = (obj, prop) => {
        try {
          Object.defineProperty(obj, prop, {
            get: () => undefined,
            configurable: false,
            enumerable: true
          });
          console.log(`Modifié ${prop} en undefined`);
        } catch (e) {
          console.debug(`Impossible de modifier ${prop}:`, e);
        }
      };

      // Liste des propriétés à rendre undefined
      const propsToHide = [
        'userAgent', 'platform', 'language', 'languages', 'hardwareConcurrency',
        'deviceMemory', 'vendor', 'appVersion', 'userAgentData', 'oscpu',
        'connection', 'getBattery', 'getGamepads', 'permissions', 'mediaDevices',
        'serviceWorker', 'geolocation', 'clipboard', 'credentials', 'keyboard',
        'locks', 'mediaCapabilities', 'mediaSession', 'plugins', 'presentation',
        'scheduling', 'usb', 'xr', 'mimeTypes',
        //web audio


      ];

      // Appliquer undefined à toutes les propriétés
      propsToHide.forEach(prop => makeUndefined(navigator, prop));

      // Rendre Canvas inutilisable
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function () {
        return null;
      };
    }
  });

  // Modifier les en-têtes HTTP
  const rule = {
    id: 999,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "User-Agent", operation: "remove" },
        { header: "Accept-Language", operation: "remove" },
        { header: "DNT", operation: "remove" },
        { header: "Sec-CH-UA", operation: "remove" },
        { header: "Sec-CH-UA-Mobile", operation: "remove" },
        { header: "Sec-CH-UA-Platform", operation: "remove" },
        { header: "Sec-CH-UA-Platform-Version", operation: "remove" },
        { header: "sec-ch-ua-full-version-list", operation: "remove" },
        { header: "sec-ch-ua-mobile", operation: "remove" },
        { header: "sec-ch-ua-platform", operation: "remove" },
        { header: "sec-ch-ua-platform-version", operation: "remove" },
        { header: "Device-Memory", operation: "remove" },
        { header: "Referer", operation: "remove" },
        { header: "Sec-Fetch-Site", operation: "remove" },
        // { header: "Accept-Encoding", operation: "remove" },
        { header: "Sec-Ch-Device-Memory", operation: "remove" },
        { header: "Sec-ch-drp", operation: "remove" },
        { header: "viewport-width", operation: "remove" },
        { header: "viewport-height", operation: "remove" },
      ]
    },
    condition: {
      urlFilter: "*",
      resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
    }
  };

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [999, 1],
    addRules: [rule]
  });
}



// navigator spoofing
function getFakeNavigatorProperties(config) {
  const platforms = ['Windows NT 10.0', 'Windows NT 11.0', 'MacIntel', 'Linux x86_64'];
  const languages = {
    'fr-FR': ['fr-FR', 'fr'],
    'en-US': ['en-US', 'en'],
    'en-GB': ['en-GB', 'en'],
    'es-ES': ['es-ES', 'es'],
    'de-DE': ['de-DE', 'de']
  };

  // const browser = config.navSpoofBrowser === 'random' ? getRandomElement(Object.keys(browsersVersions)) : (config.navSpoofBrowser || getRandomElement(Object.keys(browsersVersions)));

  const platform = config.platform === 'random' ? getRandomElement(platforms) : (config.platform || getRandomElement(platforms));
  const language = config.language === 'random' ? getRandomElement(Object.keys(languages)) : (config.language || getRandomElement(Object.keys(languages)));

  const minVersion = config.minVersion === 0 ? getRandomInRange(70, 100) : (config.minVersion || 70);
  const maxVersion = config.maxVersion === 0 ? getRandomInRange(minVersion, 120) : (config.maxVersion || 120);
  const browserVersion = generateBrowserVersion(minVersion, maxVersion);

  const hardwareConcurrency = config.hardwareConcurrency === 0 ? getRandomElement([2, 4, 8, 16]) : parseInt(config.hardwareConcurrency);
  const deviceMemory = config.deviceMemory === 0 ? getRandomElement([4, 8, 16, 32]) : parseInt(config.deviceMemory);

  // Création de l'objet fakeNavigator
  const fakeNavigator = {
    platform: platform,
    userAgent: `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`,
    language: language,
    languages: languages[language],
    hardwareConcurrency: hardwareConcurrency,
    deviceMemory: deviceMemory,
    vendor: 'Google Inc.',
    maxTouchPoints: platform.includes('Windows') ? 0 : 5,
    cookieEnabled: true,
    doNotTrack: '1',
    appName: 'Netscape',
    appCodeName: 'Mozilla',
    appVersion: ` ${platform} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`,
    onLine: true,
    //NOTE: browser it's not in this list
    // browser:browser,
    //TEST:
    //plugins et undefined sould work
    // plugins: undefined,
    // mimeTypes: undefined,
    // mediaDevices: undefined,
    // serviceWorker: undefined,
    // geolocation: undefined,
    // clipboard: undefined,
    // credentials: undefined,
    // keyboard: undefined,
    // locks: undefined,
    // mediaCapabilities: undefined,
    // mediaSession: undefined,
    // presentation: undefined,
    // scheduling: undefined,
    // usb: undefined,
    // xr: undefined,
  };
  console.log('fakeNavigator cree avec les propriétés suivantes: ', fakeNavigator);
  return fakeNavigator;
}

function applySpoofingNavigator(fakeNavigator) {
  // Obtenir les clés de l'objet fakeNavigator
  const propertiesToSpoof = Object.keys(fakeNavigator);

  // Appliquer le spoofing pour chaque propriété
  propertiesToSpoof.forEach((prop) => {
    Object.defineProperty(navigator, prop, {
      get: () => fakeNavigator[prop],
      configurable: true,
      enumerable: true,
    });
    console.log(`spoof de la propriété ${prop} avec la valeur ${fakeNavigator[prop]}`);
  });

  Object.defineProperty(navigator, 'plugins', {
    get: () => undefined,
    configurable: true,
    enumerable: true
  });

  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => undefined,
    configurable: true,
    enumerable: true
  });

}

//user agent data spoofing
function getFakeUserAgentData(userAgentConfig) {
  const brands = [
    "Google Chrome",
    "Edge",
    "Firefox",
    "Safari"
  ];

  // Créer des valeurs basées sur l'objet userAgentConfig
  const platform = userAgentConfig.uaPlatform === 'random'
    ? getRandomElement(["Linux", "Windows NT 10.0", "MacIntel", "Windows 11"])
    : userAgentConfig.uaPlatform;

  const platformVersion = userAgentConfig.uaPlatformVersion === 'random'
    ? `${getRandomInRange(6, 12)}.${getRandomInRange(0, 10)}.${getRandomInRange(0, 100)}`
    : userAgentConfig.uaPlatformVersion;

  const architecture = userAgentConfig.uaArchitecture === 'random'
    ? getRandomElement(["x86", "x86_64"])
    : userAgentConfig.uaArchitecture;

  const bitness = userAgentConfig.uaBitness === 'random'
    ? getRandomElement(["32", "64"])
    : userAgentConfig.uaBitness;

  const wow64 = userAgentConfig.uaWow64 === 'random'
    ? getRandomElement([true, false])
    : userAgentConfig.uaWow64;

  const model = userAgentConfig.uaModel === 'random'
    ? getRandomElement(["", "Model X", "Model Y"])
    : userAgentConfig.uaModel;

  const uaFullVersion = userAgentConfig.uaFullVersion === 'random'
    ? generateBrowserVersion(120, 130)
    : userAgentConfig.uaFullVersion;

  const brand = settings.browser === 'random' ? getRandomElement(brands) : settings.browser;

  // Créer un objet userAgentData fictif
  const fakeUserAgentData = {
    brands: [
      { brand: brand, version: generateBrowserVersion(120, 130) },
      { brand: getRandomElement(['Not=A?Brand']), version: generateBrowserVersion(8, 20) }
    ],
    mobile: false,
    platform: platform,
    platformVersion: platformVersion,
    architecture: architecture,
    bitness: bitness,
    wow64: wow64,
    // model: model,
    uaFullVersion: uaFullVersion,
    fullVersionList: [
      { brand: brand, version: uaFullVersion },
      { brand: brand, version: generateBrowserVersion(120, 130) }
    ],
  };
  console.log('fakeUserAgentData cree avec les propriétés suivantes: ', fakeUserAgentData);
  return fakeUserAgentData;
}
function applyUserAgentData(fakeUserAgentData) {
  Object.defineProperty(navigator, 'userAgentData', {
    get: () => fakeUserAgentData,
    configurable: true,
    enumerable: true
  });

  console.log('userAgentData modifié:', navigator.userAgentData);
}
// Génération des règles
const browsersVersions = {
  "Chrome": [129, 128, 127, 126],
  "Firefox": [126, 125, 124],
  "Safari": [17, 16, 15],
  "Opera": [90, 89, 88],
  "Edge": [109, 108, 107],
};

function getNewRules(config, ruleId) {
  // Génération des en-têtes
  const platform = config.uaPlatform === 'random' ? getRandomElement(["Linux", "Windows NT 10.0", "MacIntel", "Windows 11"]) : config.uaPlatform;

  const userAgent = `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${getRandomElement([129, 128, 127, 126])}.${getRandomInRange(0, 9)}.${getRandomInRange(0, 9)} Safari/537.36`;
  const headers = [
    {
      header: "User-Agent",
      operation: "set",
      value: userAgent
    },
    { header: "sec-ch-ua", operation: "set", value: config.secChUa === 'random' ? getRandomElement(["", "Chromium", "Not A;Brand"]) : config.secChUa },
    { header: "sec-ch-ua-mobile", operation: "set", value: config.secChUaMobile === 'random' ? "?0" : config.secChUaMobile },
    { header: "sec-ch-ua-platform", operation: "set", value: config.secChUaPlatform === 'random' ? '""' : config.secChUaPlatform },
    { header: "sec-ch-ua-full-version", operation: "set", value: config.secChUaFullVersion === 'random' ? "" : config.secChUaFullVersion },
    { header: "sec-ch-ua-platform-version", operation: "set", value: config.secChUaPlatformVersion === 'random' ? "" : config.secChUaPlatformVersion },
    { header: "Device-Memory", operation: "set", value: config.hDeviceMemory === 0 ? String(getRandomElement([8, 16, 32])) : String(config.hDeviceMemory) },
    { header: "Referer", operation: "set", value: config.referer || "" },
    // { header: "Content-Encoding", operation: "set", value: config.contentEncoding === 'random' ? getRandomElement(["gzip", "deflate"]) : config.contentEncoding },
    { header: "sec-ch-ua-full-version-list", operation: "set", value: "" }
  ];

  return [{
    id: ruleId,
    priority: 10,
    action: { type: "modifyHeaders", requestHeaders: headers },
    condition: {
      urlFilter: "*",
      resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "xmlhttprequest"],
    },
  }];
}
//modify user agent
function getFakeUserAgent(config) {
  const minVersion = config.minVersion === 0 ? getRandomInRange(70, 100) : (config.minVersion || 70);
  const maxVersion = config.maxVersion === 0 ? getRandomInRange(120, 130) : (config.maxVersion || 120);
  const uaPlatform = config.uaPlatform === 'random' ? getRandomElement(["Linux", "Windows NT 10.0", "MacIntel", "Windows 11"]) : config.uaPlatform;
  const browserVersion = generateBrowserVersion(minVersion, maxVersion);

  const fakeUserAgent_data_with_relatated_properties = {
    userAgent: `Mozilla/5.0 (${uaPlatform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`,
    platform: uaPlatform,
    appVersion: `5.0 (${uaPlatform} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`
  };
  console.log('fakeUserAgent cree avec les propriétés suivantes: ', fakeUserAgent_data_with_relatated_properties);
  return fakeUserAgent_data_with_relatated_properties;

}
function applyUserAgent(userAgentObj) {
  // Appliquer le User-Agent
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgentObj.userAgent,
    configurable: true,
    enumerable: true
  });

  // Appliquer la plateforme
  Object.defineProperty(navigator, 'platform', {
    value: userAgentObj.platform,
    configurable: true,
    enumerable: true
  });

  // Appliquer la version de l'application
  Object.defineProperty(navigator, 'appVersion', {
    value: userAgentObj.appVersion,
    configurable: true,
    enumerable: true
  });
}

// Fonctions utilitaires pour obtenir des éléments aléatoires
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBrowserVersion(minVersion, maxVersion) {
  const major = getRandomInRange(minVersion, maxVersion);
  const minor = getRandomInRange(0, 99);
  return `${major}.${minor}.0`;
}

// Fonction pour générer un User-Agent aléatoire
function generateUserAgent(browser) {
  const version = getRandomElement(browsersVersions[browser]);

  switch (browser) {
    case "Chrome":
      return `Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${getRandomInRange(0, 999)} Safari/537.36`;
    case "Firefox":
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`;
    case "Safari":
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version}.0 Safari/605.1.15`;
    case "Opera":
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${getRandomInRange(0, 999)} Safari/537.36`;
    case "Edge":
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${getRandomInRange(0, 999)} Safari/537.36`;
    default: return "";
  }
}

