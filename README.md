# ai-team-sandbox

Spielwiese für ein kleines AI-Entwicklungsteam auf GitHub. Der Mensch (@jcolameo) ist Product Owner und gibt frei, die Agents erledigen die Arbeit dazwischen. Das Repo ist ein Experiment für den Prozess, nicht ein Produkt. Das Beispielprojekt ist eine kleine Node.js-Bibliothek (`src/`) ohne Abhängigkeiten.

## Ablauf

```
Du: Issue anlegen (Formular "Feature")
  └─ Planner (Abacus)        kommentiert Rückfragen oder eine Spezifikation
Du: status:ready, danach agent:go
  └─ Developer (Claude Code) setzt um, öffnet einen Draft-PR
  └─ CI                      Lint und Tests
  └─ Verifier (Abacus)       prüft den PR unabhängig, empfiehlt Freigabe oder Änderungen
Du: Merge
```

Mehr passiert nicht automatisch. Nach jedem Schritt wartet das System auf dich oder auf die CI.

## Wer macht was

| Rolle | Läuft auf | Startet bei | Ergebnis |
|---|---|---|---|
| Planner | Abacus-API, `gemini-3.8-flash` | neues Issue vom Repo-Besitzer mit `status:inbox` | Kommentar, `status:needs-info` oder `status:refined` |
| Developer | Claude Code in GitHub Actions (Claude-Pro-Abo), max. 30 Turns | du setzt `agent:go` auf ein Issue mit `status:ready` | Draft-PR auf `agent/<nr>-…` mit Übergabeblock |
| Verifier | Abacus-API, `gpt-6-sol` | CI auf einem `agent/*`-PR ist grün | PR-Kommentar mit Urteil je Akzeptanzkriterium |
| Mensch | du | – | `status:ready`, `agent:go`, Merge |

Der Developer läuft auf Claude, Planner und Verifier auf Modellen anderer Anbieter, damit niemand seine eigene Arbeit prüft.

## Was Abacus hier tut

Abacus ist ein Dienst, den GitHub bei Bedarf aufruft, kein Programm, das nebenher läuft. Die Workflows senden Text (Issue oder PR-Diff plus Anweisungen aus `.github/prompts/`) an die Abacus-RouteLLM-API (`https://routellm.abacus.ai/v1`, OpenAI-kompatibel) und bekommen Text zurück. Dieser Text wird als Kommentar gepostet. Abacus hat keinen Zugriff auf das Repo, ändert keinen Code und setzt keine Labels. Jeder Aufruf verbraucht Credits aus dem Abacus-Abo.

## Status-Labels

| Label | Bedeutung |
|---|---|
| `status:inbox` | neu, noch nicht geprüft |
| `status:needs-info` | Planner hat Rückfragen |
| `status:refined` | spezifiziert, wartet auf deine Freigabe |
| `status:ready` | von dir freigegeben |
| `status:in-progress` | Developer arbeitet (Sperre) |
| `status:in-review` | PR offen, Verifier prüft |
| `status:awaiting-merge` | Verifier empfiehlt Freigabe, wartet auf deinen Merge |
| `status:rework` | Verifier fordert Änderungen, du entscheidest über einen neuen Lauf |
| `status:needs-human` | Agent gestoppt, Entscheidung nötig |

Nachbesserung: Fordert der Verifier Änderungen, setzt er `rework:1` (beim zweiten Mal `rework:2`). Du setzt `status:ready` und `agent:go` erneut, der Developer arbeitet dann auf demselben PR weiter. Beim dritten Mal landet das Issue bei `status:needs-human`. Weitere Labels: `source:human|agent`, `type:feature|finding`, `risk:low|medium|high`, `deps:ok`.

## Sicherheitsregeln

- Das Repo ist öffentlich. Planner und Developer reagieren nur auf Aktionen des Repo-Besitzers, Fremde lösen nichts aus und verbrauchen keine Credits.
- Nur du setzt `status:ready` und `agent:go` und mergst. Kein Agent hat Merge-Rechte, `main` ist per Ruleset geschützt (PR und grüne CI Pflicht, kein Force-Push).
- Der Verifier läuft über `workflow_run`: Workflow und Skripte kommen immer aus `main`. Der PR-Code wird nie ausgeführt, nur als Diff gelesen.
- Feste Regeln schlagen das Modell: Ändert ein PR `.github/`, `.claude/`, `CLAUDE.md`, `LICENSE`, `package-lock.json` oder die Abhängigkeiten in `package.json`, fordert der Verifier immer Änderungen.
- Issue-Text und PR-Inhalte gelten als Daten, nie als Anweisung. Der Text kommt nur über Umgebungsvariablen in Skripte, nie in Shell-Befehle.
- Limits: Developer max. 30 Turns und 30 Minuten, höchstens zwei Nachbesserungen pro Issue, ein Developer-Lauf gleichzeitig.
- Secrets (`CLAUDE_CODE_OAUTH_TOKEN`, `ABACUS_API_KEY`) liegen nur als Actions-Secrets und sind nirgends einsehbar.

## Einrichtung

1. Claude GitHub App für das Repo installieren: <https://github.com/apps/claude>
2. Secrets setzen: `CLAUDE_CODE_OAUTH_TOKEN` (aus `claude setup-token`) und `ABACUS_API_KEY` (RouteLLM-API-Schlüssel aus dem Abacus-Konto).
3. Labels anlegen: `bash scripts/setup-labels.sh` (braucht `gh auth login`).
4. Optional `main` schützen (PR und Check `test` verlangen).

## Entwickeln

```bash
npm test        # Tests mit node:test
npm run lint    # Syntaxprüfung
```

Struktur: `src/` Beispielcode, `scripts/` Skripte der Agents (`abacus.mjs`, `planner.mjs`, `verifier.mjs`) mit Tests, `.github/workflows/` Workflows, `.github/prompts/` Anweisungen für Planner und Verifier, `.github/ISSUE_TEMPLATE/` Formulare, `CLAUDE.md` Regeln für den Developer, `docs/PLAN.md` Plan und Hintergründe.

## Bekannte Grenzen

- Der Verifier sieht nur den Diff, führt nichts aus und ist eine Empfehlung. Die CI liefert den Testnachweis.
- Pro Issue ein Developer-Lauf, ein Issue nach dem anderen starten. Wartende Läufe derselben Gruppe werden von GitHub verworfen, wenn mehrere dazukommen.
- Der Developer teilt sich das Kontingent des Claude-Pro-Abos mit deiner interaktiven Nutzung.
- Der Planner reagiert nur beim Anlegen eines Issues, nicht auf spätere Kommentare.
