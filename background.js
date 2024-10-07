// Configuration par défaut
const defaultSettings = {
  spoofNavigator: false,
  spoofUserAgent: false,
  spoofCanvas: false,
  blockImages: false,
  blockJS: false,
  autoReloadAll: false,
  autoReloadCurrent: false,
  platform: 'random',
  language: 'random',
  hardwareConcurrency: 4,
  deviceMemory: 16,
  minVersion: 110,
  maxVersion: 120,
};

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
        files: ['./spoofer/spoof-navigator.js'],
        injectImmediately: true,
        world: 'MAIN'
      }).catch(console.error);
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


