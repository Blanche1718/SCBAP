# Integration Famoco - Envoi des pointages SCBAP

## Endpoint


POST https://scbap.onrender.com/webhooks/pointages/biometrie


## Headers obligatoires

Content-Type: application/json
x-webhook-timestamp: <timestamp_unix_actuel>
x-webhook-signature: sha256=<signature_hmac_sha256>


### Role des headers

`Content-Type`

Indique que le corps de la requete est du JSON.

`x-webhook-timestamp`

Timestamp Unix actuel, en secondes ou millisecondes. Il doit etre genere a chaque requete. Le serveur refuse les requetes avec plus de 5 minutes d'ecart.

`x-webhook-signature`

Signature HMAC SHA256 calculee a chaque requete avec le secret partage `WEBHOOK_SECRET`.

## Body JSON

{
  "nfc": "BADGE_NFC_DU_BENEFICIAIRE",
  "timestamp": "2026-06-02T18:30:00.000Z",
  "centreNom": "Centre de Cotonou",
  "deviceId": "FAMOCO-001",
  "success": true
}

## Calcul de la signature

Construire d'abord le body JSON exact qui sera envoye.

Exemple :

```json
{"nfc":"BADGE-12345","timestamp":"2026-06-02T18:30:00.000Z","centreNom":"Centre de Cotonou","deviceId":"FAMOCO-001","success":true}
```

Construire ensuite la chaine a signer :

```txt
<x-webhook-timestamp>.<body_json_exact>
```

Exemple :

```txt
1780425000.{"nfc":"BADGE-12345","timestamp":"2026-06-02T18:30:00.000Z","centreNom":"Centre de Cotonou","deviceId":"FAMOCO-001","success":true}
```

Calculer :

```txt
HMAC_SHA256(secret = WEBHOOK_SECRET, message = chaine_a_signer)
```

Envoyer le resultat hexadecimal dans le header :

```txt
x-webhook-signature: sha256=<resultat_hexadecimal>
```

## Exemple JavaScript

```js
const crypto = require("crypto");

const url = "https://scbap.onrender.com/webhooks/pointages/biometrie";
const secret = "VALEUR_DU_WEBHOOK_SECRET";
const timestamp = Math.floor(Date.now() / 1000).toString();

const body = JSON.stringify({
  nfc: "BADGE-12345",
  timestamp: new Date().toISOString(),
  centreNom: "Centre de Cotonou",
  deviceId: "FAMOCO-001",
  success: true
});

const signature = crypto
  .createHmac("sha256", secret)
  .update(`${timestamp}.${body}`)
  .digest("hex");

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-timestamp": timestamp,
    "x-webhook-signature": `sha256=${signature}`
  },
  body
});
```

## Reponses possibles

Succes :

```json
{
  "message": "Pointage biométrique enregistré avec succès",
  "data": {}
}
```

Erreurs frequentes :

- `401 Signature webhook manquante` : headers signature/timestamp absents.
- `401 Timestamp webhook invalide` : heure du terminal incorrecte ou trop ancienne.
- `401 Signature webhook invalide` : signature incorrecte, secret incorrect ou body signe different du body envoye.
- `400 Donnees invalides` : champ manquant ou format incorrect.

## Points importants

- Ne jamais envoyer `WEBHOOK_SECRET` dans la requete.
- `x-webhook-signature` doit etre recalcule a chaque requete.
- `x-webhook-timestamp` doit etre recalcule a chaque requete.
- Le body signe doit etre exactement le meme que le body envoye.
- L'horloge du terminal Famoco doit etre synchronisee.
