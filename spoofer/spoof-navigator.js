// appliquer l'usurpation du Navigator
applySpoofing({
    platform: 'random',
    language: 'random',
    hardwareConcurrency: getRandomInRange(4, 8, 16),
    deviceMemory: getRandomInRange(8, 16, 32),
    minVersion: 120,
    maxVersion: 128,
});

// appliquer l'usurpation du UserAgentData
applyUserAgentDataSpoofing();

function applySpoofing(config) {
    try {
        const platforms = ['Windows NT 10.0', 'Windows NT 11.0', 'MacIntel', 'Linux x86_64'];
        const languages = {
            'fr-FR': ['fr-FR', 'fr'],
            'en-US': ['en-US', 'en'],
            'en-GB': ['en-GB', 'en'],
            'es-ES': ['es-ES', 'es'],
            'de-DE': ['de-DE', 'de']
        };

        const platform = config.platform === 'random' ? getRandomElement(platforms) : config.platform;
        const language = config.language === 'random' ? getRandomElement(Object.keys(languages)) : config.language;
        const browserVersion = generateBrowserVersion(config.minVersion, config.maxVersion);

        const fakeNavigator = {
            platform: platform,
            userAgent: `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`,
            language,
            languages: languages[language],
            hardwareConcurrency: parseInt(config.hardwareConcurrency),
            deviceMemory: parseInt(config.deviceMemory),
            vendor: 'Google Inc.',
            maxTouchPoints: platform.includes('Windows') ? 0 : 5,
            cookieEnabled: true,
            doNotTrack: '1',
            appName: 'Netscape',
            appCodeName: 'Mozilla',
            onLine: true,
            // webdriver: false, // TODO: verifier les consequences quand on change ce paramètre
            appVersion: `5.0 ( ${platform} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36 )`,
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
            },
            // permissions: {
            //     query: async () => ({
            //         state: getRandomElement(['granted', 'prompt'])
            //     })
            // }
        };

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
}

// Fonction pour appliquer le spoofing de userAgentData
function applyUserAgentDataSpoofing() {
    try {
        // Définir des marques fictives
        const brands = [
            "Chromium",
            "Not=A?Brand",
            "Firefox",
            "Safari"
        ];

        // Créer des valeurs aléatoires
        const mobile = getRandomElement([true]); //TODO: doit je introduire false?
        const platform = getRandomElement(["Linux", "Windows NT 10.0", "MacIntel", "Windows 11"]);
        const platformVersion = `${getRandomInRange(6, 12)}.${getRandomInRange(0, 10)}.${getRandomInRange(0, 100)}`;
        const architecture = getRandomElement(["x86", "x86_64"]);
        const bitness = getRandomElement(["32", "64"]);
        // const wow64 = (architecture === "x86_64") ? true : false;
        const wow64 = getRandomElement([true]);
        const model = getRandomElement(["", "Model X", "Model Y"]);
        const uaFullVersion = generateBrowserVersion(120, 130);

        // Créer un objet userAgentData fictif
        const fakeUserAgentData = {
            get brands() {
                return [
                    { brand: getRandomElement(brands), version: generateBrowserVersion(120, 130) },
                    { brand: getRandomElement(brands), version: generateBrowserVersion(120, 130) }
                ];
            },
            get mobile() {
                return mobile;
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
                    { brand: getRandomElement(brands), version: uaFullVersion },
                    { brand: getRandomElement(brands), version: generateBrowserVersion(120, 130) }
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




