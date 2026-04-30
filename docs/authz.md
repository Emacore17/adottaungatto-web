# Strategia per autenticazione, autorizzazione e ruoli

## Autenticazione

Flussi da prevedere:

- registrazione email e password;
- verifica email;
- login e logout;
- recupero password;
- cambio email;
- cambio password;
- login con Google;
- eventuale verifica telefono in una milestone successiva.

Password:

- implementazione iniziale con `scrypt` nativo Node.js;
- possibile hardening futuro verso Argon2id;
- policy minima ragionevole;
- nessun log di password o token;
- reset token monouso, hashato e con scadenza breve.

Sessioni:

- implementazione iniziale con bearer token restituito da API;
- token sessione salvato hashato a database o Redis;
- cookie `HttpOnly`, `Secure` in produzione e `SameSite=Lax` quando il
  frontend usera sessioni browser complete;
- rotazione sessione dopo login e azioni sensibili;
- logout con revoca server-side;
- scadenza assoluta e inattivita.

## API implementata

Endpoint iniziali:

- `POST /auth/register`: crea utente `pending_verification`, assegna il ruolo
  `registered_user` se presente, crea una sessione e invia una mail di
  verifica;
- `POST /auth/login`: verifica email/password e crea una nuova sessione;
- `POST /auth/email-verification/request`: crea un nuovo token monouso e invia
  la mail di verifica all'utente autenticato;
- `POST /auth/email-verification/verify`: consuma il token monouso, imposta
  `email_verified_at` e porta lo stato da `pending_verification` ad `active`;
- `POST /auth/password-reset/request`: accetta una email e risponde sempre in
  modo generico, inviando un token solo se l'utente esiste;
- `POST /auth/password-reset/confirm`: consuma un token valido, aggiorna la
  password e revoca le sessioni attive dell'utente;
- `GET /auth/me`: restituisce utente e sessione corrente da header
  `Authorization: Bearer ...`;
- `POST /auth/logout`: revoca la sessione associata al bearer token.
- `GET /users/me`: restituisce profilo utente corrente, contatti verificati e
  ruoli.
- `PATCH /users/me`: aggiorna nome visualizzato, telefono e, quando consentito,
  `profile_type`.

Gli endpoint autenticati usano un guard bearer riusabile che valida la sessione
e rende disponibile il contesto autenticato ai controller.

Policy iniziale per `profile_type`:

- l'utente puo sempre mantenere il valore attuale o tornare a `private`;
- il passaggio a `professional`, `association`, `shelter` o `breeder` richiede
  ruolo `professional_user`, `moderator` o `admin`;
- la modifica del telefono resetta `phone_verified_at`.

Verifica email:

- i token sono salvati solo come hash;
- ogni nuova richiesta invalida i token precedenti non consumati;
- i token sono monouso e hanno scadenza configurabile con
  `EMAIL_VERIFICATION_TTL_MINUTES`;
- in locale le email sono recapitate su Mailpit.

Recupero password:

- l'endpoint di richiesta non espone se l'email e' registrata;
- i token sono salvati solo come hash;
- ogni nuova richiesta invalida i token precedenti non consumati;
- i token sono monouso e hanno scadenza configurabile con
  `PASSWORD_RESET_TTL_MINUTES`;
- al reset riuscito tutte le sessioni attive dell'utente sono revocate;
- in locale le email sono recapitate su Mailpit.

## Autorizzazione

Usare RBAC per ruoli generali e controlli di ownership per le risorse.

Ruoli iniziali:

- anonimo;
- utente registrato;
- utente professionale;
- moderatore;
- amministratore.

Esempi di permessi:

- `listing:create`;
- `listing:update:own`;
- `listing:submit_review:own`;
- `listing:moderate`;
- `report:create`;
- `report:manage`;
- `user:manage`;
- `config:manage`.

## Regole server-side

- Un utente puo modificare solo i propri annunci, salvo ruoli interni.
- Solo moderatore/admin puo approvare, rifiutare o sospendere.
- Solo annunci pubblicati e approvati sono visibili pubblicamente.
- I dati personali di contatto sono visibili solo secondo preferenze utente e
  permessi.
- Ogni azione admin/moderatore genera audit log.

## Protezioni

- Rate limit su login, registrazione, reset password, contatto e upload.
- CSRF dove si usano cookie e richieste browser state-changing.
- Validazione input lato API.
- Protezione brute force su credenziali.
- Logging eventi sensibili senza dati personali superflui.
