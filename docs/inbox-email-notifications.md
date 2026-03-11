# Inbox Email Notifications

Dieses Projekt ruft nach dem Speichern einer Nachricht die Supabase Edge Function `send-inbox-email` auf.
Die Function versendet eine E-Mail mit dem Nachrichteninhalt an alle Empfaenger der neuen Inbox-Nachricht(en).

## 1. Resend vorbereiten

1. Account bei Resend anlegen.
2. API Key erzeugen.
3. Eine gueltige Absenderadresse hinterlegen (z. B. `KILA <no-reply@deine-domain.tld>`).

## 2. Supabase Secrets setzen

Im Projektordner:

```bash
supabase secrets set RESEND_API_KEY=dein_resend_api_key
supabase secrets set EMAIL_FROM="KILA <no-reply@deine-domain.tld>"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase der Function automatisch bereit.

## 3. Function deployen

```bash
supabase functions deploy send-inbox-email
```

Optional lokal testen:

```bash
supabase functions serve send-inbox-email --no-verify-jwt
```

## 4. Wichtiger Hinweis

Wenn der Mailversand fehlschlaegt, bleibt die Nachricht trotzdem im Postfach gespeichert.
Der Versandfehler wird derzeit nur im Browser-Log (`console.error`) protokolliert.
