# EduSchedule Pro

EduSchedule Pro est une application web de gestion académique permettant de gérer les emplois du temps, le pointage des enseignants, les cahiers de texte et les fiches de vacation.

Le projet est organisé en deux parties :

- un frontend développé avec React ;
- un backend développé en PHP avec une base de données MySQL.

L’application fonctionne en local avec WAMP Server.

# 1. Fonctionnement général de l’application

EduSchedule Pro repose sur plusieurs rôles utilisateurs. Chaque rôle accède uniquement aux fonctionnalités qui lui sont autorisées.

## Administrateur

L’administrateur peut :

- consulter le tableau de bord ;
- voir les emplois du temps ;
- consulter tous les pointages ;
- effectuer un pointage manuel ;
- consulter tous les cahiers de texte ;
- suivre les fiches de vacation ;
- accéder aux données globales de l’application.

## Enseignant

L’enseignant peut :

- consulter ses cours ;
- générer un QR-Code de pointage ;
- pointer sa présence ;
- remplir le cahier de texte d’une séance ;
- signer le cahier après la signature du délégué ;
- consulter ses fiches de vacation.

## Délégué de classe

Le délégué peut :

- consulter les séances de sa classe ;
- voir le statut de pointage des enseignants ;
- signer le cahier de texte côté classe.

## Surveillant

Le surveillant peut :

- contrôler les pointages ;
- effectuer un pointage manuel ;
- consulter les informations liées au suivi des présences.

## Comptable

Le comptable peut :

- consulter les fiches de vacation ;
- suivre les validations et les paiements.


# 2. Modules disponibles

## 2.1 Tableau de bord

Le tableau de bord donne une vue d’ensemble sur :

- les cours programmés ;
- les pointages ;
- les cahiers de texte ;
- les fiches de vacation ;
- les statistiques générales.

## 2.2 Emploi du temps

Le module emploi du temps permet de consulter les séances programmées par semaine.

Chaque séance contient :

- la classe ;
- la matière ;
- l’enseignant ;
- le jour ;
- l’horaire ;
- la salle ;
- le type de séance ;
- la semaine concernée.

## 2.3 Pointage QR-Code

Le pointage peut se faire de deux manières :

1. par QR-Code ;
2. manuellement par un administrateur ou un surveillant.

Lorsqu’un enseignant est pointé, la présence est enregistrée en base de données et devient visible dans le cahier de texte.

## 2.4 Cahier de texte

Le cahier de texte suit le déroulement pédagogique d’une séance.

Le processus est le suivant :

1. l’enseignant sélectionne une séance ;
2. il renseigne le titre et le contenu du cours ;
3. il enregistre le cahier ;
4. le délégué signe le cahier ;
5. l’enseignant signe après le délégué ;
6. le cahier est clôturé.

Les cahiers et les signatures sont enregistrés dans MySQL.

## 2.5 Fiches de vacation

Les fiches de vacation permettent de suivre les heures effectuées par les enseignants.

Une fiche contient :

- l’enseignant ;
- la classe ;
- la matière ;
- le nombre d’heures ;
- le taux horaire ;
- le montant brut ;
- la retenue ;
- le montant net ;
- le statut de validation.

# 3. Technologies utilisées

## Frontend

- React
- Vite
- JavaScript
- CSS

## Backend

- PHP
- API REST
- PDO

## Base de données

- MySQL / MariaDB
- phpMyAdmin

## Environnement local

- WAMP Server
- Node.js
- npm
- Git

# 4. Structure du projet

EduSchedule-Pro/
│
├── backend/
│   └── api/
│       ├── schedule.php
│       ├── teacher_qr.php
│       ├── cahiers_texte.php
│       └── ...
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   ├── package.json
│   └── package-lock.json
│
├── database/
│   └── eduschedulepro.sql
│
├── README.md
└── .gitignore

**# 5. Installation du projet**

**Étape 1 : installer les logiciels nécessaires**

Avant de lancer le projet, il faut installer :

WAMP Server ;
Node.js ;
npm ;
Git ;
un navigateur web.

**Étape 2 : cloner le dépôt GitHub**

Ouvrir un terminal puis exécuter :

git clone https://github.com/sanabechir/EduSchedule-Pro.git

Ou télécharger le projet directement depuis GitHub avec le bouton Code > Download ZIP.

**Étape 3 : placer le projet dans WAMP**

Copier le dossier du projet dans :

C:\wamp64\www\

Le chemin final doit être :

C:\wamp64\www\EduSchedule-Pro

**Étape 4 : importer la base de données**

Démarrer WAMP, puis ouvrir phpMyAdmin :

http://localhost/phpmyadmin

Créer une base de données appelée :

eduschedulepro

Importer ensuite le fichier SQL situé dans :

database/eduschedulepro.sql

Ce fichier contient la structure et les données nécessaires pour tester l’application.

**Étape 5 : vérifier la configuration MySQL**

Le backend PHP utilise cette configuration :

Host : 127.0.0.1
Port : 3308
Base de données : eduschedulepro
Utilisateur : root
Mot de passe : vide

Si votre WAMP utilise le port 3306 au lieu de 3308, il faut modifier le port dans les fichiers PHP du dossier :

backend/api/

Exemple à modifier :

mysql:host=127.0.0.1;port=3308;dbname=eduschedulepro;charset=utf8mb4

Remplacer 3308 par 3306 si nécessaire.

**Étape 6 : installer les dépendances frontend**

Ouvrir un terminal dans le dossier frontend :

cd C:\wamp64\www\EduSchedule-Pro\frontend

Installer les dépendances :

npm install

**Étape 7 : lancer le frontend**

Toujours dans le dossier frontend :

npm run dev

L’application sera disponible à l’adresse :

http://localhost:5173

**6. Vérification rapide du backend**

Avant de tester le site, il est conseillé de vérifier que les API fonctionnent.

Ouvrir ces liens dans le navigateur :

http://127.0.0.1/EduSchedule-Pro/backend/api/schedule.php?action=list

Cette API doit retourner les séances de cours.

http://127.0.0.1/EduSchedule-Pro/backend/api/teacher_qr.php?action=history

Cette API doit retourner l’historique des pointages.

http://127.0.0.1/EduSchedule-Pro/backend/api/cahiers_texte.php?action=list

Cette API doit retourner les cahiers de texte.

Si ces liens retournent un JSON avec "success": true, le backend fonctionne.

**7. Utilisation de l’application**

**7.1 Connexion**

Lancer le frontend :

http://localhost:5173

Se connecter avec un compte présent dans la base de données.

Les comptes exacts sont ceux fournis dans la table des utilisateurs de la base importée.

**7.2 Tester le pointage**

Pour tester le pointage :

se connecter comme administrateur, surveillant ou enseignant ;
aller dans le module Pointage QR-Code ;
sélectionner une séance ;
générer un QR-Code ou effectuer un pointage manuel ;
vérifier que le pointage apparaît dans l’historique.

Le pointage enregistré doit ensuite apparaître dans le module Cahier de texte.

**7.3 Tester le cahier de texte**

Le test du cahier de texte se fait en plusieurs étapes.

Étape 1 : enseignant
se connecter comme enseignant ;
ouvrir le module Cahier de texte ;
sélectionner une séance ;
remplir le titre de la séance ;
remplir le contenu réalisé ;
cliquer sur Enregistrer.
Étape 2 : délégué
se connecter comme délégué de la classe concernée ;
ouvrir le module Cahier de texte ;
sélectionner la même séance ;
signer dans la zone de signature du délégué ;
valider la signature.
Étape 3 : enseignant
se reconnecter comme enseignant ;
revenir sur la même séance ;
vérifier que la signature du délégué est visible ;
signer côté enseignant ;
le cahier est alors clôturé.

**7.4 Tester les fiches de vacation**

Pour tester les fiches de vacation :

clôturer d’abord un cahier de texte ;
aller dans le module Fiches de vacation ;
générer ou consulter la fiche liée à la séance ;
vérifier les informations de l’enseignant ;
vérifier le nombre d’heures ;
vérifier le montant brut, la retenue et le montant net ;
tester l’export PDF si disponible.

**8. Comptes de test**

Les comptes de test dépendent des données importées dans la base MySQL.

À vérifier dans la table des utilisateurs.

Exemple de présentation possible :

Administrateur
Nom : Administrateur
Email : admin@isge.bf
Mot de passe : password123

Enseignant
Nom : TRAORE Jean
Email : traore@isge.bf
Mot de passe : password123

Enseignant
Nom : KABORE Paul
Email : kabore@isge.bf
Mot de passe : password123

Enseignant
Nom : OUEDRAOGO Issa
Email : ouedraogo@isge.bf
Mot de passe : password123

Enseignant
Nom : SANKARA Mariam
Email : sankara@isge.bf
Mot de passe : password123

Enseignant
Nom : COMPAORE Adama
Email : compaore@isge.bf
Mot de passe : password123

Enseignant
Nom : SAWADOGO Ibrahim
Email : sawadogo@isge.bf
Mot de passe : password123

Enseignant
Nom : NIKIEMA Salif
Email : nikiema@isge.bf
Mot de passe : password123

Enseignant
Nom : ZONGO Aminata
Email : zongo@isge.bf
Mot de passe : password123

Délégué Licence 1 RIT
Nom : Délégué L1 RIT
Email : delegue.l1@isge.bf
Mot de passe : password123

Délégué Licence 2 RIT
Nom : Délégué L2 RIT
Email : delegue.l2@isge.bf
Mot de passe : password123

Délégué Licence 3 RIT
Nom : Délégué L3 RIT
Email : delegue.l3@isge.bf
Mot de passe : password123

Délégué Master 1 RSI
Nom : Délégué M1 RSI
Email : delegue.m1@isge.bf
Mot de passe : password123

Délégué Master 2 RSI
Nom : Délégué M2 RSI
Email : delegue.m2@isge.bf
Mot de passe : password123

Surveillant
Nom : Surveillant Général
Email : surveillant@isge.bf
Mot de passe : password123

Comptable
Nom : Responsable Comptable
Email : comptable@isge.bf
Mot de passe : password123

Remarque : si les mots de passe sont hashés dans la base de données, il faut utiliser les identifiants définis par le développeur lors de la création des comptes.

# Droits et pouvoirs des utilisateurs

L’application EduSchedule Pro fonctionne avec un système de rôles. Chaque utilisateur possède des droits précis selon son profil. Cela permet de limiter l’accès aux fonctionnalités sensibles et d’adapter l’interface à chaque type d’utilisateur.

## Administrateur

L’administrateur possède l’accès le plus complet à l’application.

Il peut :

- consulter le tableau de bord général ;
- voir toutes les classes ;
- voir tous les enseignants ;
- consulter tous les emplois du temps ;
- créer ou modifier des séances ;
- générer des QR-Codes de pointage ;
- effectuer un pointage manuel ;
- consulter l’historique de tous les pointages ;
- consulter tous les cahiers de texte ;
- remplir ou corriger un cahier si nécessaire ;
- consulter les signatures des cahiers ;
- exporter les documents PDF ;
- suivre les fiches de vacation ;
- consulter les rapports et statistiques.

L’administrateur est donc le rôle de supervision globale.

---

## Enseignant

L’enseignant accède principalement aux informations liées à ses propres cours.

Il peut :

- consulter ses séances programmées ;
- voir ses cours de la semaine ;
- générer le QR-Code de présence pour ses cours ;
- pointer sa présence ;
- consulter son historique de pointage ;
- remplir le cahier de texte d’une séance ;
- renseigner le titre, le contenu, les travaux et les observations ;
- voir la signature du délégué ;
- signer le cahier après la signature du délégué ;
- clôturer le cahier après signature finale ;
- consulter ses fiches de vacation ;
- exporter certains documents PDF liés à ses cours.

L’enseignant ne doit normalement pas voir ou modifier les cours d’un autre enseignant.

---

## Délégué de classe

Le délégué est associé à une classe précise.

Il peut :

- consulter les séances de sa classe ;
- voir les pointages liés aux cours de sa classe ;
- vérifier si l’enseignant a été pointé présent, absent ou en retard ;
- consulter le cahier de texte de sa classe ;
- signer le cahier de texte côté classe ;
- confirmer que la séance a bien été réalisée.

Le délégué ne peut pas signer un cahier appartenant à une autre classe.

---

## Surveillant

Le surveillant intervient surtout dans le contrôle des présences.

Il peut :

- consulter les séances programmées ;
- contrôler l’état des pointages ;
- consulter l’historique des présences ;
- effectuer un pointage manuel en cas de problème ;
- marquer un enseignant présent, absent ou en retard ;
- suivre les présences par classe ou par enseignant.

Le surveillant ne remplit pas le cahier de texte à la place de l’enseignant, sauf si des droits particuliers lui sont accordés dans l’application.

---

## Comptable

Le comptable intervient principalement dans le suivi administratif des vacations.

Il peut :

- consulter les fiches de vacation ;
- voir les heures effectuées par les enseignants ;
- consulter les montants associés aux vacations ;
- suivre les fiches validées ;
- marquer ou suivre les paiements selon les droits prévus ;
- exporter les documents liés aux vacations si l’option est disponible.

Le comptable n’intervient pas dans le pointage ni dans la rédaction des cahiers de texte.

---

# Résumé des droits par rôle

| Fonctionnalité | Admin | Enseignant | Délégué | Surveillant | Comptable |
|---|---:|---:|---:|---:|---:|
| Voir le tableau de bord | Oui | Oui | Oui | Oui | Oui |
| Voir tous les emplois du temps | Oui | Non | Non | Oui | Non |
| Voir ses propres cours | Oui | Oui | Non | Oui | Non |
| Voir les cours de sa classe | Oui | Non | Oui | Oui | Non |
| Créer ou modifier une séance | Oui | Non | Non | Non | Non |
| Générer un QR-Code | Oui | Oui | Non | Oui | Non |
| Scanner / effectuer un pointage | Oui | Oui | Non | Oui | Non |
| Faire un pointage manuel | Oui | Non | Non | Oui | Non |
| Voir tous les pointages | Oui | Non | Non | Oui | Non |
| Voir ses propres pointages | Oui | Oui | Non | Oui | Non |
| Voir les pointages de sa classe | Oui | Non | Oui | Oui | Non |
| Remplir le cahier de texte | Oui | Oui | Non | Non | Non |
| Signer le cahier côté délégué | Oui | Non | Oui | Non | Non |
| Signer le cahier côté enseignant | Oui | Oui | Non | Non | Non |
| Clôturer un cahier | Oui | Oui | Non | Non | Non |
| Consulter les fiches de vacation | Oui | Oui | Non | Non | Oui |
| Valider / suivre les paiements | Oui | Non | Non | Non | Oui |
| Exporter des PDF | Oui | Oui | Selon droits | Selon droits | Oui |

---

# Workflow des droits dans le cahier de texte

Le cahier de texte suit un ordre précis :

1. L’enseignant remplit le cahier.
2. Le délégué de la classe signe le cahier.
3. L’enseignant signe à son tour.
4. Le cahier est clôturé.
5. La séance peut ensuite être prise en compte pour la vacation.

Ce workflow permet d’éviter qu’un cahier soit validé sans confirmation de la classe.

**9. Fichiers importants**
Backend
backend/api/schedule.php

Gère les emplois du temps.

backend/api/teacher_qr.php

Gère les QR-Codes et les pointages.

backend/api/cahiers_texte.php

Gère les cahiers de texte et les signatures.

Frontend
frontend/src/pages/PointageQRCode.jsx

Interface de pointage QR-Code.

frontend/src/pages/CahierTextePage.jsx

Interface du cahier de texte.

frontend/src/pages/VacationsPage.jsx

Interface des fiches de vacation.

Base de données
database/eduschedulepro.sql

Fichier SQL à importer dans phpMyAdmin.

**10. Problèmes fréquents**
Le site ne s’ouvre pas

Vérifier que le frontend est lancé :

npm run dev

Puis ouvrir :

http://localhost:5173
Le backend ne répond pas

Vérifier que WAMP est démarré.

Tester :

http://127.0.0.1/EduSchedule-Pro/backend/api/schedule.php?action=list
Erreur de connexion à la base de données

Vérifier :

que la base eduschedulepro existe ;
que le fichier SQL a bien été importé ;
que le port MySQL est correct ;
que WAMP est bien lancé.

Le projet utilise généralement le port :

3308

Si votre installation utilise :

3306

modifier les fichiers PHP du dossier backend/api.

Les emplois du temps ne s’affichent pas

Vérifier dans phpMyAdmin que la table creneaux contient des données.

Vérifier aussi que la colonne week_key contient une semaine correspondant à celle sélectionnée dans l’interface.

Les pointages ne s’affichent pas

Tester l’API :

http://127.0.0.1/EduSchedule-Pro/backend/api/teacher_qr.php?action=history

Si elle ne retourne pas "success": true, vérifier la table des pointages dans la base de données.

Les cahiers de texte ne se synchronisent pas

Tester l’API :

http://127.0.0.1/EduSchedule-Pro/backend/api/cahiers_texte.php?action=list

Si elle retourne "success": true, la synchronisation backend fonctionne.

**11. Remarques importantes pour le test**

Le projet est prévu pour être testé en local.

Les URL du backend sont écrites pour un projet placé dans :

C:\wamp64\www\EduSchedule-Pro

Si le nom du dossier change, certaines URL peuvent devoir être modifiées dans le frontend.

Les dépendances node_modules ne sont pas incluses dans le dépôt GitHub. Elles doivent être installées avec :

npm install

## 12. Auteur

Projet réalisé par :
KIENDREBEOGO ABDOUL RAHIM
LAGWARE LARISSA
SANA BECHIR SAID

Dans le cadre d’un projet académique à l’ISGE-BF.
