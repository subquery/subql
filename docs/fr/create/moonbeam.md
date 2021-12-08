# Support de l'EVM Moonbeam

Nous fournissons un processeur de données sur mesure pour Moonbeam et MoonRiver EVM. Ceci offre un moyen simple de filtrer et d'indexer à la fois l'activité EVM et Substrate sur les réseaux de Moonbeam au sein d'un seul projet SubQuery.

Réseaux pris en charge :

| Nom du réseau  | Point de terminaison Websocket                     | Point de terminaison du dictionnaire                                 |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam       | _Bientôt disponible_                               | _Bientôt disponible_                                                 |
| Moonriver      | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**Vous pouvez également vous référer au projet d'exemple [de Moonriver EVM](https://github.com/subquery/tutorials-moonriver-evm-starter) avec un gestionnaire d'événements et d'appels.** Ce projet est également hébergé en direct dans le SubQuery Explorer [ici](https://explorer.subquery.network/subquery/subquery/moonriver-evm-starter-project).

## Pour commencer

1. Ajouter la source de données personnalisée en tant que dépendance `yarn add @subql/contract-processors`
2. Ajouter une source de données personnalisée comme décrit ci-dessous
3. Ajouter des gestionnaires pour la source de données personnalisée à votre code

## Spécification de la source de données

| Champ             | Type                                                           | Requis | Description                                           |
| ----------------- | -------------------------------------------------------------- | ------ | ----------------------------------------------------- |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Oui    | Référence du fichier au code du processeur de données |
| processor.options | [Options du processeur](#processor-options)                    | Non    | Options spécifiques au processeur de Moonbeam         |
| actifs            | `{ [key: String]: { file: String }}`                           | Non    | Un objet de fichiers de ressources externes           |

### Options du processeur

| Champ   | Type             | Requis | Description                                                                                                                |
| ------- | ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| abi     | String           | Non    | L'ABI qui est utilisé par le processeur pour analyser les arguments. DOIT être une clé d' `actifs`                         |
| adresse | String or `null` | Non    | Une adresse de contrat d'où l'événement provient ou un appel y ai fait. `null` capturera les appels de création de contrat |

## MoonbeamCall

Fonctionne de la même manière que [substrate/CallHandler](../create/mapping/#call-handler) sauf avec un argument de gestion différent et des modifications mineures de filtrage.

| Champ  | Type                            | Requis | Description                                             |
| ------ | ------------------------------- | ------ | ------------------------------------------------------- |
| kind   | 'substrate/MoonbeamCall'        | Oui    | Spécifie qu'il s'agit d'un gestionnaire de type d'appel |
| filter | [Filtre d'appel](#call-filters) | Non    | Filtrer la source de données à exécuter                 |

### Filtres d'appel

| Champ    | Type   | Exemple(s)                                    | Description                                                                                                                                                                             |
| -------- | ------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| function | String | 0x095ea7b3, approve(address to,uint256 value) | Soit [Signature de fonction](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) chaînes </a> ou la fonction `sighash` pour filtrer la fonction appelée sur le contrat |
| from     | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | Une adresse Ethereum qui a envoyé la transaction                                                                                                                                        |

### Gestionnaires

Contrairement à un gestionnaire normal, vous n'obtiendrez pas un `SubstrateExtrinsic` en tant que paramètre, au lieu de cela, vous obtiendrez un `MoonbeamCall` qui est basé sur le type Ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse).

Changements depuis le type `TransactionResponse`:

- Il n'a pas de propriétés `attendre` et `confirmer`
- Une propriété `succes` est ajoutée pour savoir si la transaction a été un succès
- `args` est ajouté si le champ `abi` est fourni et que les arguments peuvent être analysés avec succès

## MoonbeamEvent

Fonctionne de la même manière que [substrate/CallHandler](../create/mapping/#event-handler) sauf avec un argument de gestion différent et des modifications mineures de filtrage.

| Champ  | Type                                  | Requis | Description                                             |
| ------ | ------------------------------------- | ------ | ------------------------------------------------------- |
| kind   | 'substrate/MoonbeamEvent'             | Oui    | Spécifie qu'il s'agit d'un gestionnaire de type d'appel |
| filter | [Filtre d’événements](#event-filters) | Non    | Filtrer la source de données à exécuter                 |

### Filtres d'événement

| Champ  | Type         | Exemple(s)                                                      | Description                                                                                                                                              |
| ------ | ------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| topics | String array | Transfer(address indexed from,address indexed to,uint256 value) | Le filtre des sujets suit les filtres de log Ethereum JSON-PRC , vous trouverez plus de documentation [ici](https://docs.ethers.io/v5/concepts/events/). |

<b>Note sur les sujets :</b>
Il y a quelques améliorations à partir des filtres de log de base :

- Les sujets n'ont pas besoin d'être rembourrés 0
- Les chaînes [fragments d'événement](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) peuvent être fournies et converties automatiquement à leur id

### Gestionnaires

Contrairement à un gestionnaire normal, vous n'obtiendrez pas un `SubstrateExtrinsic` en tant que paramètre, au lieu de cela, vous obtiendrez un `MoonbeamCall` qui est basé sur le type Ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-Log).

Changements depuis le type `Log`:

- `args` est ajouté si le champ `abi` est fourni et que les arguments peuvent être analysés avec succès

## Exemple de Source de Données

Ceci est un extrait du fichier manifeste `project.yaml`.

```yaml
dataSources:
  - kind: substrate/Moonbeam
    startBlock: 752073
    processor:
      file: './node_modules/@subql/contract-processors/dist/moonbeam.js'
      options:
        # Doit être une clé d'actifs
        abi: erc20
        # Adresse du contrat (ou du destinataire en cas de transfert) à filtrer, si `null`, ce sera pour la création du contrat.
        address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
    assets:
      erc20:
        file: './erc20.abi.json'
    mapping:
      file: './dist/index.js'
      handlers:
        - handler: handleMoonriverEvent
          kind: substrate/MoonbeamEvent
          filter:
            topics:
              - Transfer(address indexed from,address indexed to,uint256 value)
        - handler: handleMoonriverCall
          kind: substrate/MoonbeamCall
          filter:
            ## La fonction peut être soit un fragment de fonction, soit une signature.
            # function: '0x095ea7b3'
            # function: '0x7ff36ab500000000000000000000000000000000000000000000000000000000'
            # function: approve(address,uint256)
            function: approve(address to,uint256 value)
            from: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
```

## Limitations connues

- Il n'y a actuellement aucun moyen de interroger l'état EVM dans un gestionnaire
- Il n'y a aucun moyen d'obtenir les reçus de transaction avec les gestionnaires d'appel
- Les propriétés `blockHash` sont actuellement laissées indéfinies, la propriété `blockNumber` peut être utilisée à la place
