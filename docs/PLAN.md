# Plan Phase 0 und 1: Null-Kosten-Setup

Stand 13.10.2026. Rahmen: Claude Pro (OAuth-Token), vorhandenes Abacus-Abo, GitHub Free, separates Repo `ai-team-sandbox`. Das Arcware-Repo wird nicht angefasst.

## Rollen

| Rolle | Läuft auf | Auslöser | Ausgabe |
|---|---|---|---|
| Planner | Abacus (Phase 0 manuell, Phase 1 über RouteLLM-API in Actions) | neues Issue | Rückfragen oder Spec als Kommentar, `status:refined` |
| Developer | Claude Code in Actions, Sonnet, max. 30 Turns | du setzt `agent:go` auf `status:ready` | Draft-PR mit Übergabeblock |
| Verifier | Abacus über RouteLLM-API in Actions (Phase 1) | CI auf einem `agent/*`-PR ist grün | PR-Kommentar mit Urteil pro Akzeptanzkriterium |
| Merge | du | manuell | – |

## Phase 0: Fundament (ca. 1 Abend)

1. Repo `ai-team-sandbox` anlegen (Entscheidung privat/öffentlich, siehe unten).
2. Dateien aus diesem Ordner committen: `CLAUDE.md`, `package.json`, `src/`, `.github/`, `scripts/`, `docs/`.
3. Labels anlegen: `bash scripts/setup-labels.sh` (braucht `gh auth login`).
4. Claude GitHub App für das Repo installieren: https://github.com/apps/claude
5. Token erzeugen: `claude setup-token`, dann `gh secret set CLAUDE_CODE_OAUTH_TOKEN`.
6. Abacus-Planner manuell: Prompt aus Abschnitt „Planner-Prompt“ in ChatLLM, Ergebnis als Issue-Kommentar einfügen.
7. Erstes Testissue mit dem Formular „Feature“ anlegen, `status:ready` und danach `agent:go` setzen.

**Abnahme Phase 0**
- CI ist auf `main` grün.
- Ein Testissue erzeugt einen Draft-PR auf `agent/<nr>-…`, und auf diesem PR startet die CI.
- Das Issue trägt danach `status:in-review` oder bei Fehlern `status:needs-human`, und das Label `agent:go` ist entfernt.
- Ein `agent:go` von einem anderen Account oder ohne `status:ready` startet keinen Lauf.

**In Phase 0 zu prüfende Annahmen**
- Pushes laufen über die Claude App und lösen deshalb die CI aus (darum `persist-credentials: false`). Startet die CI auf dem PR nicht, ist das der erste Punkt zum Debuggen.
- `gh pr create` funktioniert im Lauf mit dem Token, das die Action bereitstellt.
- Ein Lauf mit 30 Turns passt in das Pro-Kontingent, ohne dass deine interaktive Nutzung am selben Tag blockiert wird.

## Phase 1: Planner und Verifier mit Abacus (1–2 Wochen)

Voraussetzung: Die RouteLLM-API ist laut Abacus-FAQ im ChatLLM-Abo enthalten und verbraucht Credits. Basis-URL, Authentifizierung und Modellnamen stehen erst nach dem Login in der API-Doku. Sobald du mir diese Angaben gibst (ohne den Schlüssel selbst), schreibe ich:

- `scripts/abacus-call.mjs`: kleiner Adapter (Prompt + Kontext → Antwort), liest den Schlüssel aus `ABACUS_API_KEY`
- `.github/workflows/agent-planner.yml`: bei `issues.opened` mit `source:human` kommentiert Abacus Rückfragen oder Spec und setzt `status:refined` oder `status:needs-info`
- `.github/workflows/agent-verifier.yml`: nach grüner CI auf `agent/*`-PRs prüft Abacus Diff, Übergabeblock und Akzeptanzkriterien und postet ein Urteil
- Rework-Logik: Bei „Changes requested“ setzt der Workflow `rework:1` und startet den Developer erneut mit dem Review als Kontext. Bei `rework:2` gibt es keinen weiteren Lauf, sondern `status:needs-human`.

Regeln für den Verifier:
- Für die Unabhängigkeit wählt er über RouteLLM ein Nicht-Anthropic-Modell.
- Er hat keine Schreibrechte auf den Branch. Sein Job läuft mit `contents: read`, das Posten des Urteils in einem eigenen Job.
- Befunde außerhalb der Akzeptanzkriterien werden Issues mit dem Formular „Befund“ (`status:inbox`, `source:agent`) und lösen nichts aus.

**Abnahme Phase 1**
- 10 Sandbox-Issues durchlaufen den ganzen Prozess.
- Mindestens 7 davon werden mit höchstens einer Nachbesserung gemergt.
- Es gibt keine Endlosschleife und keinen Lauf ohne Statuslabel am Ende.
- Kein Agent ändert `.github/`, `.claude/` oder `CLAUDE.md`.
- Je Lauf sind Dauer, Turns und Abacus-Credits notiert. Daraus folgt die Entscheidung, ob das Setup trägt.

## Entscheidung offen: privat oder öffentlich

| | Privat (GitHub Free) | Öffentlich (GitHub Free) |
|---|---|---|
| Actions-Minuten | 2.000 pro Monat (ein Lauf ca. 5–20 Min.) | unbegrenzt auf Standard-Runnern |
| Branch-Schutz für `main` | auf Free für private Repos voraussichtlich nicht verfügbar, vor dem Setup prüfen | verfügbar |
| Sichtbarkeit | nur du | Code, Issues und Actions-Logs öffentlich; Secrets werden in Logs maskiert |
| Fremde Issues | – | möglich, lösen aber keine Läufe aus: Gate auf deinen Account, und die Action verlangt Schreibrechte |

Ohne Branch-Schutz schützt nur deine Disziplin `main`. Die Tool-Regeln im Workflow verbieten dem Agent zwar Pushes auf `main` und Merges, technisch hätte die Claude App aber Schreibrechte.

## Bekannte Grenzen dieses Setups

- **Kein `--bare` möglich.** Laut Doku liest `--bare` keine OAuth-Anmeldung, nur API-Schlüssel. Ausgleich: Der Developer-Workflow läuft auf dem Stand von `main`, und den mergst nur du. Änderungen an `.claude/` oder `CLAUDE.md` in PRs immer selbst prüfen.
- **Geteiltes Kontingent.** Agent-Läufe und deine interaktive Claude-Nutzung teilen sich das Pro-Limit. Darum laufen Developer-Läufe nacheinander.
- **Ein wartender Lauf pro Gruppe.** Mehrere Issues schnell hintereinander zu labeln, bricht wartende Läufe ab. Also ein Issue nach dem anderen starten.
- **Die offizielle Claude App hat weite Rechte**, u. a. Workflows write. Für eine Sandbox ist das vertretbar, vor einem echten Projekt sollte eine eigene, schmale App her.

## Planner-Prompt für Abacus (Phase 0, manuell)

```
Du bist Planner für das Repo ai-team-sandbox (Node 22, keine Abhängigkeiten, Tests mit node:test).
Prüfe das folgende Issue. Antworte in genau einer von zwei Formen:
A) RÜCKFRAGEN: nummerierte Liste konkreter Fragen, wenn Ziel oder Akzeptanzkriterien unklar sind.
B) SPEC: 1) Zusammenfassung in 2 Sätzen 2) präzisierte, testbare Akzeptanzkriterien
   3) betroffene Dateien (Vermutung) 4) Risiken 5) Vorschlag zur Aufteilung, falls größer als ein PR.
Erfinde keine Anforderungen. Issue:
<Issue-Text einfügen>
```
