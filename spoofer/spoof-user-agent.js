// Fonction pour obtenir un élément aléatoire d'un tableau
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fonction pour générer une version de navigateur aléatoire
function generateBrowserVersion(minVersion, maxVersion) {
  const major = getRandomInRange(minVersion, maxVersion);
  const minor = getRandomInRange(0, 99);
  return `${major}.${minor}.0`;
}

// Fonction pour obtenir un nombre aléatoire dans une plage donnée
function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
    const mobile = getRandomElement([false]);
    const platform = getRandomElement(["Linux", "Windows NT 10.0", "MacIntel", "Windows 11.0"]);
    const platformVersion = `${getRandomInRange(6, 12)}.${getRandomInRange(0, 10)}.${getRandomInRange(0, 100)}`;
    const architecture = getRandomElement(["x86_64"]);
    const bitness = getRandomElement(["64"]);
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

// Appeler la fonction pour appliquer le spoofing
applyUserAgentDataSpoofing();
