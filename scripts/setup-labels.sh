#!/usr/bin/env bash
# Legt die Labels an, die Issue-Templates und Workflows erwarten.
# Aufruf im Sandbox-Repo: bash scripts/setup-labels.sh
# Mehrfach ausführbar: bestehende Labels werden aktualisiert (--force).
set -euo pipefail

label() { gh label create "$1" --color "$2" --description "$3" --force; }

# Status (genau einer pro Issue)
label "status:inbox"        "ededed" "Neu, noch nicht geprüft"
label "status:needs-info"   "fbca04" "Rückfragen offen"
label "status:refined"      "c5def5" "Spezifiziert, wartet auf Freigabe"
label "status:ready"        "0e8a16" "Von Jeremy freigegeben"
label "status:in-progress"  "1d76db" "Agent arbeitet (Sperre)"
label "status:in-review"    "5319e7" "PR offen, wartet auf Review"
label "status:rework"       "d93f0b" "Verifier fordert Änderungen, du entscheidest über neuen Lauf"
label "status:awaiting-merge" "0e8a16" "Verifier empfiehlt Freigabe, wartet auf deinen Merge"
label "status:needs-human"  "b60205" "Agent gestoppt, Entscheidung nötig"

# Agent-Steuerung
label "agent:go"            "0052cc" "Startet den Developer-Agent (nur Jeremy)"
label "rework:1"            "f9d0c4" "Erste Nachbesserung"
label "rework:2"            "e99695" "Zweite Nachbesserung, danach needs-human"

# Herkunft und Typ
label "source:human"        "bfdadc" "Von Jeremy erstellt"
label "source:agent"        "d4c5f9" "Von einem Agent erstellt"
label "type:feature"        "a2eeef" "Neue Funktion"
label "type:finding"        "d93f0b" "Befund aus Review oder Lauf"

# Risiko und Sonderfreigaben
label "risk:low"            "c2e0c6" "Isoliert, leicht rückgängig"
label "risk:medium"         "fef2c0" "Mittleres Risiko"
label "risk:high"           "f9d0c4" "Kernlogik oder Daten"
label "deps:ok"             "5319e7" "Neue Abhängigkeit freigegeben"

echo "Labels angelegt."
