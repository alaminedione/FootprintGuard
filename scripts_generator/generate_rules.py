import json
import os
import random
import shutil

# Versions spécifiques pour chaque navigateur
browsers_versions = {
    "Chrome": [120, 119, 118],
    "Firefox": [126, 125, 124],
    "Safari": [17, 16, 15],
}


# Fonction pour générer un User-Agent aléatoire
def generate_user_agent():
    browser_choice = random.choice(list(browsers_versions.keys()))
    version = random.choice(browsers_versions[browser_choice])

    if browser_choice == "Chrome":
        return f"Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version}.0.{random.randint(0, 999)} Safari/537.36"
    elif browser_choice == "Firefox":
        return f"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:{version}.0) Gecko/20100101 Firefox/{version}.0"
    elif browser_choice == "Safari":
        return f"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/{version}.0 Safari/605.1.15"


# Fonction pour générer des valeurs fictives pour les en-têtes
def generate_headers():
    return [
        {"header": "User-Agent", "operation": "set", "value": generate_user_agent()},
        {"header": "sec-ch-ua", "operation": "set", "value": ""},
        {"header": "sec-ch-ua-mobile", "operation": "set", "value": "?0"},
        {"header": "sec-ch-ua-platform", "operation": "set", "value": '""'},
        {"header": "sec-ch-ua-full-version", "operation": "set", "value": ""},
        {"header": "sec-ch-ua-platform-version", "operation": "set", "value": ""},
        # test
        {"header": "sec-ch-ua-full-version-list", "operation": "set", "value": ""},
        {"header": "sec-ch-viewport-width", "operation": "set", "value": ""},
        {"header": "sec-ch-viewport-height", "operation": "set", "value": ""},
        {"header": "sec-ch-width", "operation": "set", "value": ""},
        {"header": "sec-ch-height", "operation": "set", "value": ""},
        {
            "header": "sec-ch-dpr",
            "operation": "set",
            "value": random.choice([1, 1.5, 2]),
        },
        # {"header":"sec-ch-width-actual", "operation": "set", "value": ""},
        # {"header":"sec-ch-height-actual", "operation": "set", "value": ""},
        # {"header":"sec-ch-dpr-actual", "operation": "set", "value": ""},
        # test
        # {
        #     "header": "Accept-CH",
        #     "operation": "set",
        #     "value": random.choice(["Sec-CH-Prefers", "Sec-CH-Prefers-Other-Channels"]),
        # },
        {
            "header": "Device-Memory",
            "operation": "set",
            "value": str(random.choice([8, 16, 32])),
        },
        {"header": "Referer", "operation": "set", "value": ""},
        # {
        #     "header": "Content encoding",
        #     "operation": "set",
        #     "value": random.choice(["gzip", "deflate"]),
        # },
        # {"header": "cache-control", "operation": "set", "value": ""},
        # {"header": "content-language", "operation": "set", "value": ""},
    ]


# Fonction pour générer les règles avec un ID unique
def generate_rules(rule_id):
    return [
        {
            "id": rule_id,
            "priority": 1,
            "action": {"type": "modifyHeaders", "requestHeaders": generate_headers()},
            "condition": {
                "urlFilter": "*",
                # Utilisation d'une liste fixe de types de ressources
                "resourceTypes": [
                    "main_frame",
                    "sub_frame",
                    "stylesheet",
                    "script",
                    "image",
                    "font",
                    "xmlhttprequest",
                    "csp_report",
                    "media",
                    "websocket",
                    "object",
                    "ping",
                    "webtransport",
                    "other",
                    "webbundle",
                ],
            },
        }
    ]


# Fonction pour écrire les règles dans des fichiers JSON spécifiques
def write_to_json(file_name, rules):
    with open(file_name, "w") as json_file:
        json.dump(rules, json_file, indent=4)


# Nombre de règles à générer (modifiable)
num_rules_to_generate = 100


# Supprimer le dossier 'rules' s'il existe
if os.path.exists("../rules"):
    shutil.rmtree("../rules")

# Créer le dossier 'rules'
os.makedirs("../rules")

# Génération et écriture des règles dans des fichiers séparés
for i in range(1, num_rules_to_generate + 1):
    rules = generate_rules(i)  # Passer l'index comme ID
    write_to_json(f"../rules/ruleset_{i}.json", rules)  # Écrire dans le dossier 'rules'

print(
    f"{num_rules_to_generate} règles ont été générées et écrites dans des fichiers 'ruleset_1.json' à 'ruleset_{num_rules_to_generate}.json'."
)
