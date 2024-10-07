import json
import os


# Fonction pour générer le manifest.json
def generate_manifest(num_rules):
    # Structure de base du manifest
    manifest = {
        "manifest_version": 3,
        "name": "FingerprintGuard",
        "version": "1.0.0",
        "description": "Protection contre le fingerprinting des navigateurs",
        "permissions": [
            "storage",
            "scripting",
            "declarativeNetRequest",
            "declarativeNetRequestWithHostAccess",
            "contentSettings",
            "webNavigation",
            "tabs",
        ],
        "host_permissions": ["<all_urls>"],
        "action": {
            "default_popup": "popup.html",
            "default_icon": {
                "16": "icons/icon16.png",
                "48": "icons/icon48.png",
                "128": "icons/icon128.png",
            },
        },
        "options_ui": {"page": "settings.html", "open_in_tab": True},
        "background": {"service_worker": "background.js"},
        "declarative_net_request": {"rule_resources": []},
        "icons": {
            "16": "icons/icon16.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png",
        },
    }

    # Génération des règles
    for i in range(1, num_rules + 1):
        rule_resource = {
            "id": str(i),
            "enabled": False,
            "path": f"./rules/ruleset_{i}.json",  # Assuming rules are named ruleset_1.json, ruleset_2.json, etc.
        }
        manifest["declarative_net_request"]["rule_resources"].append(rule_resource)

    return manifest


# Nombre de règles à générer (modifiable)
num_rules_to_generate = 100  # Changez ce nombre selon vos besoins

# Génération du manifest
manifest_data = generate_manifest(num_rules_to_generate)

# Écriture dans le fichier manifest.json dans le répertoire parent
with open("../manifest.json", "w") as json_file:
    json.dump(manifest_data, json_file, indent=4)

print(f"Le fichier 'manifest.json' a été généré avec {num_rules_to_generate} règles.")
