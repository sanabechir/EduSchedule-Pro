-- ============================================================
--  EduSchedule Pro — Script SQL Complet
--  Base de données : eduschedulepro
--  Auteur         : Bechir
--  Date           : 2025-2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS eduschedulepro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE eduschedulepro;

-- ============================================================
-- 1. CLASSES
-- ============================================================
CREATE TABLE classes (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code             VARCHAR(20)  NOT NULL UNIQUE,
    libelle          VARCHAR(100) NOT NULL,
    niveau           ENUM('Licence 1','Licence 2','Licence 3','Master 1','Master 2') NOT NULL,
    annee_academique VARCHAR(9)   NOT NULL DEFAULT '2025-2026',
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. MATIERES
-- ============================================================
CREATE TABLE matieres (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code                VARCHAR(20)    NOT NULL UNIQUE,
    libelle             VARCHAR(150)   NOT NULL,
    volume_horaire_total DECIMAL(5,1)  NOT NULL DEFAULT 0,
    coefficient         TINYINT UNSIGNED NOT NULL DEFAULT 1,
    created_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 3. ENSEIGNANTS
-- ============================================================
CREATE TABLE enseignants (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    matricule    VARCHAR(20)  NOT NULL UNIQUE,
    nom          VARCHAR(80)  NOT NULL,
    prenom       VARCHAR(80)  NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    telephone    VARCHAR(20),
    specialite   VARCHAR(150),
    statut       ENUM('permanent','vacataire') NOT NULL DEFAULT 'vacataire',
    taux_horaire DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    actif        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 4. SALLES
-- ============================================================
CREATE TABLE salles (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    libelle     VARCHAR(100) NOT NULL,
    capacite    SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    equipements TEXT,
    batiment    VARCHAR(80),
    disponible  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 5. UTILISATEURS
-- ============================================================
CREATE TABLE utilisateurs (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email             VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role              ENUM('admin','enseignant','delegue','surveillant','comptable','etudiant') NOT NULL,
    id_lien           INT UNSIGNED DEFAULT NULL COMMENT 'id dans la table liée (enseignants, classes...)',
    actif             TINYINT(1)   NOT NULL DEFAULT 1,
    token_reset       VARCHAR(255) DEFAULT NULL,
    token_expire      DATETIME     DEFAULT NULL,
    derniere_connexion DATETIME    DEFAULT NULL,
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 6. EMPLOIS DU TEMPS (en-têtes de planning)
-- ============================================================
CREATE TABLE emploi_temps (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_classe           INT UNSIGNED NOT NULL,
    semaine_debut       DATE         NOT NULL COMMENT 'Lundi de la semaine',
    statut_publication  ENUM('brouillon','publié') NOT NULL DEFAULT 'brouillon',
    cree_par            INT UNSIGNED NOT NULL,
    date_creation       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    date_modification   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_classe) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (cree_par)  REFERENCES utilisateurs(id),
    UNIQUE KEY unique_classe_semaine (id_classe, semaine_debut)
) ENGINE=InnoDB;

-- ============================================================
-- 7. CRENEAUX (séances planifiées + QR)
-- ============================================================
CREATE TABLE creneaux (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_emploi_temps INT UNSIGNED NOT NULL,
    id_matiere      INT UNSIGNED NOT NULL,
    id_enseignant   INT UNSIGNED NOT NULL,
    id_salle        INT UNSIGNED NOT NULL,
    jour            ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
    heure_debut     TIME         NOT NULL,
    heure_fin       TIME         NOT NULL,
    qr_token        VARCHAR(255) DEFAULT NULL UNIQUE COMMENT 'Token chiffré unique du QR-Code',
    qr_expire       DATETIME     DEFAULT NULL,
    est_ferie       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_emploi_temps) REFERENCES emploi_temps(id) ON DELETE CASCADE,
    FOREIGN KEY (id_matiere)      REFERENCES matieres(id),
    FOREIGN KEY (id_enseignant)   REFERENCES enseignants(id),
    FOREIGN KEY (id_salle)        REFERENCES salles(id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. POINTAGES (log des scans QR)
-- ============================================================
CREATE TABLE pointages (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_creneau           INT UNSIGNED NOT NULL,
    id_enseignant        INT UNSIGNED NOT NULL,
    heure_pointage_reelle DATETIME    NOT NULL,
    ip_source            VARCHAR(45)  DEFAULT NULL,
    token_utilise        VARCHAR(255) DEFAULT NULL,
    statut               ENUM('valide','retard','invalide') NOT NULL DEFAULT 'valide',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_creneau)    REFERENCES creneaux(id) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id)
) ENGINE=InnoDB;

-- ============================================================
-- 9. CAHIERS DE TEXTE
-- ============================================================
CREATE TABLE cahiers_texte (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_creneau       INT UNSIGNED NOT NULL UNIQUE,
    id_delegue       INT UNSIGNED NOT NULL,
    titre_cours      VARCHAR(255) NOT NULL,
    contenu_json     JSON         DEFAULT NULL COMMENT 'Points abordés, notions, exercices',
    niveau_avancement VARCHAR(100) DEFAULT NULL COMMENT 'ex: Chapitre 2/5',
    heure_fin_reelle TIME         DEFAULT NULL,
    observations     TEXT         DEFAULT NULL,
    statut           ENUM('brouillon','signe_delegue','cloture') NOT NULL DEFAULT 'brouillon',
    date_creation    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_creneau) REFERENCES creneaux(id) ON DELETE CASCADE,
    FOREIGN KEY (id_delegue) REFERENCES utilisateurs(id)
) ENGINE=InnoDB;

-- ============================================================
-- 10. SIGNATURES NUMERIQUES
-- ============================================================
CREATE TABLE signatures (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_cahier        INT UNSIGNED NOT NULL,
    type_signataire  ENUM('delegue','enseignant') NOT NULL,
    id_utilisateur   INT UNSIGNED NOT NULL,
    signature_base64 LONGTEXT     NOT NULL,
    horodatage       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cahier)      REFERENCES cahiers_texte(id) ON DELETE CASCADE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id),
    UNIQUE KEY unique_signature (id_cahier, type_signataire)
) ENGINE=InnoDB;

-- ============================================================
-- 11. TRAVAUX DEMANDES
-- ============================================================
CREATE TABLE travaux_demandes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_cahier   INT UNSIGNED NOT NULL,
    description TEXT         NOT NULL,
    date_limite DATE         DEFAULT NULL,
    type        ENUM('devoir','exercice','projet','lecture') NOT NULL DEFAULT 'devoir',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cahier) REFERENCES cahiers_texte(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 12. VACATIONS (en-tête fiche mensuelle)
-- ============================================================
CREATE TABLE vacations (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_enseignant    INT UNSIGNED NOT NULL,
    mois             TINYINT UNSIGNED NOT NULL COMMENT '1=Janvier ... 12=Décembre',
    annee            YEAR         NOT NULL,
    montant_brut     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    retenues         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    montant_net      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    statut           ENUM('generee','signee_enseignant','visee_surveillant','approuvee_comptable') NOT NULL DEFAULT 'generee',
    date_generation  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id),
    UNIQUE KEY unique_vacation (id_enseignant, mois, annee)
) ENGINE=InnoDB;

-- ============================================================
-- 13. LIGNES DE VACATION (détail par séance)
-- ============================================================
CREATE TABLE vacation_lignes (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vacation  INT UNSIGNED   NOT NULL,
    id_creneau   INT UNSIGNED   NOT NULL,
    duree_heures DECIMAL(4,2)   NOT NULL,
    taux         DECIMAL(10,2)  NOT NULL,
    montant      DECIMAL(12,2)  NOT NULL,
    FOREIGN KEY (id_vacation) REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_creneau)  REFERENCES creneaux(id)
) ENGINE=InnoDB;

-- ============================================================
-- 14. VALIDATIONS (chaîne de signature vacation)
-- ============================================================
CREATE TABLE validations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_vacation     INT UNSIGNED NOT NULL,
    id_validateur   INT UNSIGNED NOT NULL,
    role_validateur ENUM('enseignant','surveillant','comptable') NOT NULL,
    visa_base64     LONGTEXT     DEFAULT NULL,
    date_validation DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    commentaire     TEXT         DEFAULT NULL,
    FOREIGN KEY (id_vacation)   REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_validateur) REFERENCES utilisateurs(id)
) ENGINE=InnoDB;

-- ============================================================
-- 15. LOGS D'ACTIVITE (journal d'audit)
-- ============================================================
CREATE TABLE logs_activite (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT UNSIGNED DEFAULT NULL,
    action       VARCHAR(100) NOT NULL,
    details_json JSON         DEFAULT NULL,
    ip           VARCHAR(45)  DEFAULT NULL,
    date_heure   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- ============================================================
-- DONNEES DE DEMONSTRATION
-- ============================================================

-- Classes (5 classes)
INSERT INTO classes (code, libelle, niveau, annee_academique) VALUES
('L1-RST-A',  'Licence 1 RST Groupe A',   'Licence 1', '2025-2026'),
('L1-RST-B',  'Licence 1 RST Groupe B',   'Licence 1', '2025-2026'),
('L2-RST',    'Licence 2 RST',             'Licence 2', '2025-2026'),
('L3-RST',    'Licence 3 RST',             'Licence 3', '2025-2026'),
('M1-ITRST',  'Master 1 ITRST',            'Master 1',  '2025-2026');

-- Matières (6 matières)
INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient) VALUES
('INF101', 'Algorithmique et Structures de Données',  45.0, 3),
('INF201', 'Développement Web Full Stack',            60.0, 4),
('INF301', 'Réseaux Informatiques',                  45.0, 3),
('INF401', 'Base de Données Avancées',               45.0, 3),
('INF501', 'Sécurité des Systèmes d\'Information',   30.0, 2),
('MAT101', 'Mathématiques Discrètes',                30.0, 2);

-- Enseignants (5 enseignants)
INSERT INTO enseignants (matricule, nom, prenom, email, telephone, specialite, statut, taux_horaire) VALUES
('ENS001', 'KABORÉ',   'Moussa',    'mkabore@isge.bf',    '70000001', 'Informatique / Réseaux',       'permanent',  5000.00),
('ENS002', 'TRAORÉ',   'Aminata',   'atraore@isge.bf',    '70000002', 'Développement Web',             'vacataire',  7500.00),
('ENS003', 'SAWADOGO', 'Ibrahim',   'isawadogo@isge.bf',  '70000003', 'Base de Données',               'vacataire',  7000.00),
('ENS004', 'OUÉDRAOGO','Fatimata',  'fouedraogo@isge.bf', '70000004', 'Mathématiques / Algorithmique', 'permanent',  5000.00),
('ENS005', 'COMPAORÉ', 'Désiré',    'dcompaore@isge.bf',  '70000005', 'Sécurité Informatique',         'vacataire',  8000.00);

-- Salles (4 salles)
INSERT INTO salles (code, libelle, capacite, equipements, batiment) VALUES
('A101', 'Amphithéâtre A101',  120, 'Vidéoprojecteur, Tableau blanc, Climatisation', 'Bâtiment A'),
('B201', 'Salle Informatique B201', 40, 'PCs, Réseau local, Vidéoprojecteur',        'Bâtiment B'),
('B202', 'Salle de TP B202',   30,  'PCs, Tableau, Climatisation',                   'Bâtiment B'),
('C301', 'Salle de Cours C301', 60, 'Tableau noir, Vidéoprojecteur',                 'Bâtiment C');

-- Utilisateurs (un compte par rôle + enseignants)
-- Mot de passe pour tous : "password123" hashé en bcrypt
INSERT INTO utilisateurs (email, mot_de_passe_hash, role, id_lien) VALUES
('admin@isge.bf',        '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',        NULL),
('mkabore@isge.bf',      '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',   1),
('atraore@isge.bf',      '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',   2),
('isawadogo@isge.bf',    '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',   3),
('fouedraogo@isge.bf',   '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',   4),
('dcompaore@isge.bf',    '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant',   5),
('delegue.l1a@isge.bf',  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'delegue',      1),
('delegue.l2@isge.bf',   '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'delegue',      3),
('surveillant@isge.bf',  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'surveillant',  NULL),
('comptable@isge.bf',    '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'comptable',    NULL);

-- Emploi du temps (semaine du 28 avril 2025)
INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES
(1, '2025-04-28', 'publié', 1),
(3, '2025-04-28', 'publié', 1);

-- Créneaux pour L1-RST-A
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(1, 1, 4, 1, 'Lundi',    '08:00:00', '10:00:00'),
(1, 2, 2, 2, 'Lundi',    '10:00:00', '12:00:00'),
(1, 6, 4, 1, 'Mardi',    '08:00:00', '10:00:00'),
(1, 3, 1, 4, 'Mercredi', '14:00:00', '16:00:00'),
(1, 2, 2, 2, 'Jeudi',    '08:00:00', '10:00:00'),
(1, 4, 3, 2, 'Vendredi', '10:00:00', '12:00:00');

-- Créneaux pour L2-RST
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(2, 4, 3, 2, 'Lundi',    '14:00:00', '16:00:00'),
(2, 5, 5, 4, 'Mardi',    '10:00:00', '12:00:00'),
(2, 3, 1, 4, 'Jeudi',    '14:00:00', '16:00:00');


-- Emploi du temps pour les 3 autres classes (semaine du 28 avril 2025)
INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES
(2, '2025-04-28', 'publié', 1),  -- L1-RST-B
(4, '2025-04-28', 'publié', 1),  -- L3-RST
(5, '2025-04-28', 'publié', 1);  -- M1-ITRST

-- Créneaux pour L1-RST-B
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(3, 1, 4, 4, 'Lundi',    '08:00:00', '10:00:00'),
(3, 2, 2, 3, 'Lundi',    '10:00:00', '12:00:00'),
(3, 6, 4, 4, 'Mardi',    '08:00:00', '10:00:00'),
(3, 3, 1, 4, 'Mercredi', '08:00:00', '10:00:00'),
(3, 4, 3, 3, 'Jeudi',    '10:00:00', '12:00:00'),
(3, 2, 2, 3, 'Vendredi', '08:00:00', '10:00:00');

-- Créneaux pour L3-RST
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(4, 5, 5, 4, 'Lundi',    '08:00:00', '10:00:00'),
(4, 4, 3, 2, 'Mardi',    '14:00:00', '16:00:00'),
(4, 3, 1, 4, 'Mercredi', '10:00:00', '12:00:00'),
(4, 2, 2, 3, 'Jeudi',    '08:00:00', '10:00:00'),
(4, 5, 5, 4, 'Vendredi', '14:00:00', '16:00:00');

-- Créneaux pour M1-ITRST
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin) VALUES
(5, 5, 5, 1, 'Lundi',    '10:00:00', '12:00:00'),
(5, 4, 3, 2, 'Lundi',    '14:00:00', '16:00:00'),
(5, 3, 1, 1, 'Mardi',    '08:00:00', '10:00:00'),
(5, 2, 2, 3, 'Mercredi', '10:00:00', '12:00:00'),
(5, 5, 5, 1, 'Jeudi',    '08:00:00', '10:00:00'),
(5, 4, 3, 2, 'Vendredi', '08:00:00', '10:00:00');
