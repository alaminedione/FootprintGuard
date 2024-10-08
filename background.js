// Configuration par défaut
const defaultSettings = {
  //
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
  referer: '',
  contentEncoding: 'random'
};

//initialisation des paramètres depuis le storage
let settings = { ...defaultSettings };
chrome.storage.sync.get(settings, (stored) => {
  settings = { ...defaultSettings, ...stored };
});

//écoute des changements de paramètres et mettre a jour les regles
chrome.storage.onChanged.addListener((changes) => {
  for (let [key, { newValue }] of Object.entries(changes)) {
    settings[key] = newValue;
  }
  //on recharge les pages ou non selon les paramètres defini par l'utilisateur
  handleAutoReload();
});

//écoute les messages envoyés 
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getStatus') {
    //retourne les paramètres actuels
    sendResponse(settings);
    // return true;
  } else if (message.type === 'updateSetting') {
    //met à jour le parametre
    chrome.storage.sync.set({ [message.setting]: message.value });
    // return true;
  }
});


//écoute les navigations  et injecter les scripts selon les parametres
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.url.startsWith('chrome://') || details.url.startsWith("chrome-extension://")) {
    return;
  } else {

    //usurper le canvas
    if (settings.spoofCanvas) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['./spoofer/spoof-canvas.js'],
        injectImmediately: true,
        world: 'MAIN'
      }).then((result) => {
        console.log('Script injecté dans le canvas:', result);
      }).catch((error) => {
        console.error('Erreur lors de l\'injection du script:', error);
      });
    }

    //usurper le Navigator
    if (settings.spoofNavigator) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        injectImmediately: true,
        world: 'MAIN',
        func: applySpoofingNavigator,
        args: [settings]
      }).then((result) => {
        console.log('Script injecté dans le Navigator:', result);
      }).catch((error) => {
        console.error('Erreur lors de l\'injection du script:', error);
      });
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        injectImmediately: true,
        world: 'MAIN',
        func: applyUserAgentDataSpoofing,
        args: [settings]
      }).then((result) => {
        console.log('Script injecté dans userAgentData:', result);
      }).catch((error) => {
        console.error('Erreur lors de l\'injection du script:', error);
      });
    }

    //usurper le UserAgent
    if (settings.spoofUserAgent) {
      const newRule = getNewRules(settings);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1], //eviter la duplication
        addRules: newRule
      }).then((result) => {
        console.log('Règle modifiée:', result);
      }).catch((error) => {
        console.error('Erreur lors de la modification de la règle:', error);
      });
      console.log(`Activation du nouveau regle: ${newRule.id}`);
      if (!settings.spoofNavigator) {
        console.log("Spoof the navigator user agent niveau javascript");
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          injectImmediately: true,
          world: 'MAIN',
          func: applyUserAgentDataSpoofing,
          args: [settings]
        }).then((result) => {
          console.log('Script injecté dans userAgentData:', result);
        }).catch((error) => {
          console.error('Erreur lors de l\'injection du script:', error);
        });
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          injectImmediately: true,
          world: 'MAIN',
          func: modifyUserAgent,
          args: [settings]
        }).then((result) => {
          console.log('Script injecté dans userAgent:', result);
        }).catch((error) => {
          console.error('Erreur lors de l\'injection du script:', error);
        });
      }
    } else {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1]
      })
    }
  }
});


//gerer le blocage des images et des scripts
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.url.startsWith('chrome://') || details.url.startsWith("chrome-extension://")) {
    return;
  } else {
    chrome.contentSettings.javascript.set({
      primaryPattern: '<all_urls>',
      setting: settings.blockJS ? 'block' : 'allow'
    });
    chrome.contentSettings.images.set({
      primaryPattern: '<all_urls>',
      setting: settings.blockImages ? 'block' : 'allow'
    });
  }
});

//gerer le rechargement automatique des pages selon les parametres de l'utilisateur
async function handleAutoReload() {
  try {
    const { autoReloadAll, autoReloadCurrent } = await chrome.storage.sync.get(['autoReloadAll', 'autoReloadCurrent']);

    if (autoReloadAll) {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          await chrome.tabs.reload(tab.id);
        }
      }
    } else if (autoReloadCurrent) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('chrome-extension://')) {
        await chrome.tabs.reload(activeTab.id);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour des protections:', error);
  }
}


function applySpoofingNavigator(config) {
  try {
    const platforms = ['Windows NT 10.0', 'Windows NT 11.0', 'MacIntel', 'Linux x86_64'];
    const languages = {
      'fr-FR': ['fr-FR', 'fr'],
      'en-US': ['en-US', 'en'],
      'en-GB': ['en-GB', 'en'],
      'es-ES': ['es-ES', 'es'],
      'de-DE': ['de-DE', 'de']
    };

    // Adaptation des valeurs en fonction des spécifications de l'utilisateur
    const platform = config.platform === 'random' ? getRandomElement(platforms) : (config.platform || getRandomElement(platforms));
    const language = config.language === 'random' ? getRandomElement(Object.keys(languages)) : (config.language || getRandomElement(Object.keys(languages)));

    // Vérification des valeurs min/max pour le navigateur
    const minVersion = config.minVersion == 0 ? getRandomInRange(70, 100) : (config.minVersion || 70);
    const maxVersion = config.maxVersion == 0 ? getRandomInRange(minVersion, 120) : (config.maxVersion || 120);

    const browserVersion = generateBrowserVersion(minVersion, maxVersion);

    // Gestion des cœurs CPU et de la mémoire
    const hardwareConcurrency = config.hardwareConcurrency == 0 ? getRandomElement[2, 4, 8, 16] : parseInt(config.hardwareConcurrency);
    const deviceMemory = config.deviceMemory == 0 ? getRandomElement([4, 8, 16, 32]) : parseInt(config.deviceMemory);

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
      onLine: true,
      appVersion: `5.0 (${platform} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36)`,
      pdfViewerEnabled: true,
      scheduling: {
        isInputPending: () => false
      },
      connection: {
        effectiveType: getRandomElement(['4g', 'wifi']),
        rtt: getRandomInRange(50, 100),
        downlink: getRandomInRange(5, 15),
        saveData: false
      },
      mediaCapabilities: {
        decodingInfo: async () => ({
          supported: true,
          smooth: true,
          powerEfficient: true
        })
      }
    };

    // Définition des propriétés dans l'objet navigator
    for (let prop in fakeNavigator) {
      try {
        Object.defineProperty(navigator, prop, {
          get: () => fakeNavigator[prop],
          configurable: true,
          enumerable: true
        });
        console.log('Propriété modifiée:', prop + ' avec valeur:', fakeNavigator[prop]);
      } catch (e) {
        console.debug(`Impossible de modifier ${prop}:`, e);
      }
    }
  } catch (error) {
    console.error('Erreur lors du spoofing du navigator:', error);
  }

  // Fonctions utilitaires
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
}


function applyUserAgentDataSpoofing(userAgentConfig) {
  try {
    // Définir des marques fictives
    const brands = [
      "Google chrome",
      "Edge",
      // "Not=A?Brand",
      "Firefox",
      "Safari"
    ];

    // Créer des valeurs basées sur l'objet userAgentConfig
    const platform = userAgentConfig.uaPlatform === 'random' ? getRandomElement(["Linux", "Windows NT 10.0", "MacIntel", "Windows 11"]) : userAgentConfig.uaPlatform;
    const platformVersion = userAgentConfig.uaPlatformVersion === 'random' ? `${getRandomInRange(6, 12)}.${getRandomInRange(0, 10)}.${getRandomInRange(0, 100)}` : userAgentConfig.uaPlatformVersion;
    const architecture = userAgentConfig.uaArchitecture === 'random' ? getRandomElement(["x86", "x86_64"]) : userAgentConfig.uaArchitecture;
    const bitness = userAgentConfig.uaBitness === 'random' ? getRandomElement(["32", "64"]) : userAgentConfig.uaBitness;
    // const wow64 = (architecture === "x86_64") ? true : false; // Déterminer wow64 selon l'architecture
    const wow64 = userAgentConfig.uaWow64 === 'random' ? getRandomElement([true]) : userAgentConfig.uaWow64;
    const model = userAgentConfig.uaModel === 'random' ? getRandomElement(["", "Model X", "Model Y"]) : userAgentConfig.uaModel;
    const uaFullVersion = userAgentConfig.uaFullVersion === 'random' ? generateBrowserVersion(120, 130) : userAgentConfig.uaFullVersion;

    const brand = getRandomElement(brands)
    // Créer un objet userAgentData fictif
    const fakeUserAgentData = {
      get brands() {
        return [
          { brand: brand, version: generateBrowserVersion(120, 130) },
          { brand: getRandomElement(['Not=A?Brand']), version: generateBrowserVersion(8, 20) }
        ];
      },
      get mobile() {
        return false;
      },
      get platform() {
        return platform;
      },
      get platformVersion() {
        return platformVersion;
      },
      get architecture() {
        return architecture;
      },
      get bitness() {
        return bitness;
      },
      get wow64() {
        return wow64;
      },
      get model() {
        return model;
      },
      get uaFullVersion() {
        return uaFullVersion;
      },
      get fullVersionList() {
        return [
          { brand: brand, version: uaFullVersion },
          { brand: brand, version: generateBrowserVersion(120, 130) }
        ];
      }
    };

    // Définir la propriété userAgentData dans l'objet navigator
    Object.defineProperty(navigator, 'userAgentData', {
      value: fakeUserAgentData,
      configurable: true,
      enumerable: true
    });

    console.log('userAgentData modifié:', navigator.userAgentData);

  } catch (error) {
    console.error('Erreur lors du spoofing de userAgentData:', error);
  }

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
}


function getNewRules(config) {
  const browsersVersions = {
    "Chrome": [120, 119, 118],
    "Firefox": [126, 125, 124],
    "Safari": [17, 16, 15],
  };

  // Fonction pour générer un User-Agent aléatoire
  function generateUserAgent(browser) {
    const version = getRandomElement(browsersVersions[browser]);

    if (browser === "Chrome") {
      return `Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${getRandomInRange(0, 999)} Safari/537.36`;
    } else if (browser === "Firefox") {
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`;
    } else if (browser === "Safari") {
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version}.0 Safari/605.1.15`;
    }
  }

  // Fonction pour générer des valeurs fictives pour les en-têtes
  function generateHeaders() {
    const headers = [
      { header: "User-Agent", operation: "set", value: config.browser === 'random' ? generateUserAgent(getRandomElement(Object.keys(browsersVersions))) : generateUserAgent(config.browser) },
      { header: "sec-ch-ua", operation: "set", value: config.secChUa === 'random' ? getRandomElement(["", "Chromium", "Not A;Brand"]) : config.secChUa },
      { header: "sec-ch-ua-mobile", operation: "set", value: config.secChUaMobile === 'random' ? "?0" : config.secChUaMobile },
      { header: "sec-ch-ua-platform", operation: "set", value: config.secChUaPlatform === 'random' ? '""' : config.secChUaPlatform },
      { header: "sec-ch-ua-full-version", operation: "set", value: config.secChUaFullVersion === 'random' ? "" : config.secChUaFullVersion },
      { header: "sec-ch-ua-platform-version", operation: "set", value: config.secChUaPlatformVersion === 'random' ? "" : config.secChUaPlatformVersion },
      { header: "Device-Memory", operation: "set", value: config.hDeviceMemory === 'random' ? String(getRandomElement([8, 16, 32])) : String(config.hDeviceMemory) },
      { header: "Referer", operation: "set", value: config.referer || "" },
      { header: "Content-Encoding", operation: "set", value: config.contentEncoding === 'random' ? getRandomElement(["gzip", "deflate"]) : config.contentEncoding },
      //
      { header: "see-ch-ua-full-version-list", operation: "set", value: "" }
    ]

    return headers;
  }

  // Fonction pour générer les règles avec un ID unique
  function generateRules(ruleId) {
    return [
      {
        id: ruleId,
        priority: 10,
        action: { type: "modifyHeaders", requestHeaders: generateHeaders() },
        condition: {
          urlFilter: "*",
          resourceTypes: [
            "main_frame",
            "sub_frame",
            "stylesheet",
            "script",
            "image",
            "font",
            "xmlhttprequest",
          ],
        },
      }
    ];
  }


  // Génération d'un ID de règle unique
  // const ruleId = Date.now(); // Utiliser le timestamp comme ID unique
  const ruleId = 1

  // Fonctions utilitaires pour obtenir des éléments aléatoires
  function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Retourner les nouvelles règles
  return generateRules(ruleId);
}

function modifyUserAgent(config) {
  const minVersion = config.minVersion === 0 ? getRandomInRange(70, 100) : (config.minVersion || 70);
  const maxVersion = config.maxVersion === 0 ? getRandomInRange(120, 130) : (config.maxVersion || 120);
  const uaPlatform = config.uaPlatform === 'random' ? getRandomElement(["Linux", "Windows NT 10.0", "MacIntel", "Windows 11"]) : config.uaPlatform;
  const browserVersion = generateBrowserVersion(minVersion, maxVersion);
  const userAgent = `Mozilla/5.0 (${uaPlatform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`

  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
    enumerable: true
  });
  //platform
  Object.defineProperty(navigator, 'platform', {
    value: uaPlatform,
    configurable: true,
    enumerable: true
  })
  //appVersion
  Object.defineProperty(navigator, 'appVersion', {
    value: `5.0 (${uaPlatform} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36)`,
    configurable: true,
    enumerable: true
  })

  function generateBrowserVersion(minVersion, maxVersion) {
    const major = getRandomInRange(minVersion, maxVersion);
    const minor = getRandomInRange(0, 99);
    return `${major}.${minor}.0`;
  }

  function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
