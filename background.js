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
  uaFullVersion: 'random'
};

const navigatorFields = {
  platform: 'random',
  language: 'random',
  hardwareConcurrency: 4,
  deviceMemory: 8,
  minVersion: 110,
  maxVersion: 120
}

//maximum de règles pour le l'usurpation du header
const maxRuleset = 100;

// tenter de désactiver tous les rulesets
try {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: Array.from({ length: maxRuleset }, (_, i) => `${i + 1}`)
    // disableRulesetIds: [activeRuleset]
  }).then(console.log('Tous les rulesets ont été désactivés')).catch(console.error);
} catch (error) {
  console.error('Erreur lors de la tentative de désactivation de tous les rulesets:', error);
}

//initialisation des paramètres depuis le storage
let settings = { ...defaultSettings };
chrome.storage.sync.get(settings, (stored) => {
  settings = { ...defaultSettings, ...stored };
});

//écoute des changements de paramètres et a jour les regles
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
    return true;
  } else if (message.type === 'updateSetting') {
    //met à jour le parametre
    chrome.storage.sync.set({ [message.setting]: message.value });
    return true;
  }
});


//écoute les navigations  et injecter les scripts selon les parametres
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.url.startsWith('chrome://') || details.url.startsWith("chrome-extension://")) {
    return;
  } else {

    //usurper le canvas
    //TODO: ca ne fonctionne pas
    if (settings.spoofCanvas) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['./spoofer/spoof-canvas.js'],
        injectImmediately: true,
        world: 'MAIN'
      }).catch(console.error);
    }

    //usurper le Navigator
    if (settings.spoofNavigator) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        injectImmediately: true,
        world: 'MAIN',
        func: applySpoofingNavigator,
        args: [settings]
      }).catch(console.error);
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        injectImmediately: true,
        world: 'MAIN',
        func: applyUserAgentDataSpoofing,
        args: [settings]
      })
    }

    //usurper le UserAgent
    if (settings.spoofUserAgent) {
      const newRuleset = generateRandomRuleset(maxRuleset);

      chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [newRuleset],
        // disableRulesetIds: [newRuleset] //pour éviter les duplications
      }).catch(console.error);
      console.log(`Activation du nouveau ruleset: ${newRuleset}`);
      if (!settings.spoofNavigator) {
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          files: ['./spoofer/spoof-user-agent.js'],
          injectImmediately: true,
          world: 'MAIN'
        }).catch(console.error);
      }
      // }
    } else {
      // tenter de désactiver tous les rulesets
      try {
        chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: Array.from({ length: maxRuleset }, (_, i) => `${i + 1}`)
          // disableRulesetIds: [activeRuleset]
        }).then(console.log('Tous les rulesets ont été désactivés')).catch(console.error);
      } catch (error) {
        console.error('Erreur lors de la tentative de désactivation de tous les rulesets:', error);
      }
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

//generer un nouveau regle pour le usurpation du UserAgent selon le nombre de regles (default: 100) (max: 100)
//chrome permet un maximum de 100 regles statiques
function generateRandomRuleset(maxRuleset) {
  return (Math.floor(Math.random() * maxRuleset) + 1).toString();
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
    const minVersion = config.minVersion === 'random' ? getRandomInRange(70, 100) : (config.minVersion || 70);
    const maxVersion = config.maxVersion === 'random' ? getRandomInRange(minVersion, 120) : (config.maxVersion || 120);

    const browserVersion = generateBrowserVersion(minVersion, maxVersion);

    // Gestion des cœurs CPU et de la mémoire
    const hardwareConcurrency = config.hardwareConcurrency === 'random' ? getRandomInRange(1, 8) : parseInt(config.hardwareConcurrency);
    const deviceMemory = config.deviceMemory === 'random' ? getRandomInRange(1, 8) : parseInt(config.deviceMemory);

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
    const wow64 = userAgentConfig.uaWow64 === 'random' ? getRandomElement([true, false]) : userAgentConfig.uaWow64;
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
      // get mobile() {
      //   return mobile;
      // },
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
