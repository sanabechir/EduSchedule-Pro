-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3308
-- Généré le : mer. 13 mai 2026 à 19:09
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `eduschedulepro`
--

-- --------------------------------------------------------

--
-- Structure de la table `cahiers_texte`
--

DROP TABLE IF EXISTS `cahiers_texte`;
CREATE TABLE IF NOT EXISTS `cahiers_texte` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creneau_id` int NOT NULL,
  `titre` varchar(255) NOT NULL DEFAULT '',
  `contenu` text,
  `travaux` text,
  `observation` text,
  `statut` varchar(50) NOT NULL DEFAULT 'brouillon',
  `signature_delegue` tinyint(1) NOT NULL DEFAULT '0',
  `signature_enseignant` tinyint(1) NOT NULL DEFAULT '0',
  `signature_delegue_image` longtext,
  `signature_enseignant_image` longtext,
  `locked` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(150) DEFAULT NULL,
  `updated_by` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cahier_creneau` (`creneau_id`),
  KEY `creneau_id` (`creneau_id`),
  KEY `statut` (`statut`),
  KEY `locked` (`locked`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `cahiers_texte`
--

INSERT INTO `cahiers_texte` (`id`, `creneau_id`, `titre`, `contenu`, `travaux`, `observation`, `statut`, `signature_delegue`, `signature_enseignant`, `signature_delegue_image`, `signature_enseignant_image`, `locked`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'Introduction HTML', 'Les bases du langage', '', '', 'signe_enseignant', 1, 1, 'data:image/png;base64,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', 'data:image/png;base64,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', 1, 'enseignant@isge.bf', 'enseignant@isge.bf', '2026-05-13 10:36:07', '2026-05-13 10:36:48');

-- --------------------------------------------------------

--
-- Structure de la table `classes`
--

DROP TABLE IF EXISTS `classes`;
CREATE TABLE IF NOT EXISTS `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nom` (`nom`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `classes`
--

INSERT INTO `classes` (`id`, `nom`) VALUES
(1, 'Licence 1 RIT'),
(2, 'Licence 2 RIT'),
(3, 'Licence 3 RIT'),
(4, 'Master 1 RSI'),
(5, 'Master 2 RSI');

-- --------------------------------------------------------

--
-- Structure de la table `creneaux`
--

DROP TABLE IF EXISTS `creneaux`;
CREATE TABLE IF NOT EXISTS `creneaux` (
  `id` int NOT NULL AUTO_INCREMENT,
  `week_key` varchar(30) DEFAULT NULL,
  `classe_id` int NOT NULL,
  `matiere_id` int NOT NULL,
  `enseignant_id` int NOT NULL,
  `salle_id` int NOT NULL,
  `jour` enum('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
  `horaire_id` int NOT NULL,
  `type` enum('cours','td','tp') DEFAULT 'cours',
  `groupe` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cr_matiere` (`matiere_id`),
  KEY `fk_cr_enseignant` (`enseignant_id`),
  KEY `fk_cr_salle` (`salle_id`),
  KEY `fk_cr_horaire` (`horaire_id`),
  KEY `idx_creneaux_main` (`classe_id`,`jour`,`horaire_id`)
) ENGINE=MyISAM AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `creneaux`
--

INSERT INTO `creneaux` (`id`, `week_key`, `classe_id`, `matiere_id`, `enseignant_id`, `salle_id`, `jour`, `horaire_id`, `type`, `groupe`) VALUES
(1, '2026-05-11', 1, 1, 1, 1, 'Lundi', 1, 'cours', NULL),
(2, '2026-05-11', 3, 6, 6, 2, 'Lundi', 1, 'cours', NULL),
(4, '2026-05-11', 1, 3, 3, 2, 'Mercredi', 2, 'tp', 'GP1'),
(26, '2026-05-11', 1, 1, 1, 3, 'Mardi', 1, 'cours', NULL),
(6, '2026-05-11', 2, 4, 4, 1, 'Jeudi', 3, 'td', NULL),
(7, '2026-05-11', 2, 5, 5, 3, 'Vendredi', 4, 'cours', NULL),
(8, '2026-05-11', 5, 8, 8, 5, 'Vendredi', 4, 'cours', NULL),
(37, '2026-05-11', 1, 1, 1, 4, 'Mardi', 7, 'cours', NULL),
(32, '2026-05-11', 4, 9, 5, 3, 'Mardi', 11, 'cours', NULL),
(31, '2026-05-11', 3, 8, 18, 3, 'Mardi', 11, 'cours', NULL),
(30, '2026-05-11', 2, 4, 4, 1, 'Mardi', 11, 'cours', NULL),
(29, '2026-05-11', 2, 5, 5, 3, 'Mardi', 1, 'cours', NULL),
(27, '2026-05-11', 1, 3, 3, 1, 'Lundi', 11, 'cours', NULL),
(25, '2026-05-11', 5, 13, 4, 5, 'Jeudi', 7, 'td', NULL),
(17, '2026-05-11', 1, 3, 13, 2, 'Mercredi', 3, 'cours', NULL),
(36, '2026-05-11', 5, 8, 8, 6, 'Mardi', 12, 'cours', NULL),
(19, '2026-05-11', 3, 8, 18, 5, 'Jeudi', 4, 'cours', NULL),
(20, '2026-05-11', 4, 9, 15, 4, 'Lundi', 1, 'cours', NULL),
(21, '2026-05-11', 4, 10, 17, 4, 'Mercredi', 3, 'cours', NULL),
(22, '2026-05-11', 5, 11, 11, 4, 'Samedi', 1, 'cours', NULL),
(23, '2026-05-11', 5, 12, 18, 5, 'Vendredi', 2, 'cours', NULL),
(24, '2026-05-11', 5, 13, 14, 1, 'Vendredi', 3, 'td', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `enseignants`
--

DROP TABLE IF EXISTS `enseignants`;
CREATE TABLE IF NOT EXISTS `enseignants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `enseignants`
--

INSERT INTO `enseignants` (`id`, `nom`, `prenom`, `email`) VALUES
(1, 'TRAORE', 'Jean', 'jean@isge.bf'),
(2, 'KABORE', 'Paul', 'paul@isge.bf'),
(3, 'OUEDRAOGO', 'Issa', 'issa@isge.bf'),
(4, 'SANKARA', 'Mariam', 'mariam@isge.bf'),
(5, 'COMPAORE', 'Adama', 'adama@isge.bf'),
(6, 'SAWADOGO', 'Ibrahim', 'ibrahim@isge.bf'),
(7, 'NIKIEMA', 'Salif', 'salif@isge.bf'),
(8, 'ZONGO', 'Aminata', 'aminata@isge.bf'),
(9, 'TRAORE', 'Jean', 'jean.traore@isge.bf'),
(10, 'KABORE', 'Paul', 'paul.kabore@isge.bf'),
(11, 'TRAORE', 'Jean', 'traore@isge.bf'),
(12, 'KABORE', 'Paul', 'kabore@isge.bf'),
(13, 'OUEDRAOGO', 'Issa', 'ouedraogo@isge.bf'),
(14, 'SANKARA', 'Mariam', 'sankara@isge.bf'),
(15, 'COMPAORE', 'Adama', 'compaore@isge.bf'),
(16, 'SAWADOGO', 'Ibrahim', 'sawadogo@isge.bf'),
(17, 'NIKIEMA', 'Salif', 'nikiema@isge.bf'),
(18, 'ZONGO', 'Aristide', 'zongo@isge.bf');

-- --------------------------------------------------------

--
-- Structure de la table `horaires`
--

DROP TABLE IF EXISTS `horaires`;
CREATE TABLE IF NOT EXISTS `horaires` (
  `id` int NOT NULL AUTO_INCREMENT,
  `label` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `horaires`
--

INSERT INTO `horaires` (`id`, `label`) VALUES
(1, '07h30-09h30'),
(2, '10h00-12h15'),
(3, '13h00-16h00'),
(4, '15h00-18h00'),
(5, '08h00-12h00'),
(6, '09h00-13h00'),
(7, '14h00-18h00'),
(8, '08h00-10h00'),
(9, '10h00-12h00'),
(10, '16h00-18h00'),
(11, '12h30-14h30'),
(12, '13h30-14h30');

-- --------------------------------------------------------

--
-- Structure de la table `logs_activite`
--

DROP TABLE IF EXISTS `logs_activite`;
CREATE TABLE IF NOT EXISTS `logs_activite` (
  `id` int NOT NULL AUTO_INCREMENT,
  `utilisateur_id` int DEFAULT NULL,
  `action` text,
  `date_action` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `utilisateur_id` (`utilisateur_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `matieres`
--

DROP TABLE IF EXISTS `matieres`;
CREATE TABLE IF NOT EXISTS `matieres` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `classe_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nom` (`nom`),
  KEY `fk_matiere_classe` (`classe_id`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `matieres`
--

INSERT INTO `matieres` (`id`, `nom`, `classe_id`) VALUES
(1, 'Programmation Web', 1),
(2, 'Base de Données', 1),
(3, 'Réseaux', 1),
(4, 'Sécurité', 2),
(5, 'Cloud', 2),
(6, 'Programmation Web Avancée', 3),
(7, 'Administration Linux', 3),
(8, 'Cybersécurité', 3),
(9, 'Sécurité des Réseaux', 4),
(10, 'Base de Données Avancées', 4),
(11, 'Audit et Gouvernance SI', 5),
(12, 'Cloud Computing', 5),
(13, 'Gestion de Projet SI', 5);

-- --------------------------------------------------------

--
-- Structure de la table `pointages`
--

DROP TABLE IF EXISTS `pointages`;
CREATE TABLE IF NOT EXISTS `pointages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creneau_id` int DEFAULT NULL,
  `date_pointage` datetime DEFAULT NULL,
  `statut` enum('valide','retard','absent') DEFAULT 'valide',
  PRIMARY KEY (`id`),
  KEY `creneau_id` (`creneau_id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `pointages`
--

INSERT INTO `pointages` (`id`, `creneau_id`, `date_pointage`, `statut`) VALUES
(1, 1, '2026-05-01 06:12:28', 'valide');

-- --------------------------------------------------------

--
-- Structure de la table `presences_enseignants`
--

DROP TABLE IF EXISTS `presences_enseignants`;
CREATE TABLE IF NOT EXISTS `presences_enseignants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creneau_id` int NOT NULL,
  `enseignant_id` int NOT NULL,
  `date_cours` date NOT NULL,
  `statut` enum('present','retard','absent') NOT NULL DEFAULT 'present',
  `scanned_at` datetime DEFAULT NULL,
  `mode_pointage` enum('qr','manuel') NOT NULL DEFAULT 'qr',
  `token` varchar(100) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_presence_prof` (`creneau_id`,`enseignant_id`,`date_cours`),
  KEY `idx_presence_creneau` (`creneau_id`),
  KEY `idx_presence_enseignant` (`enseignant_id`),
  KEY `idx_presence_date` (`date_cours`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `presences_enseignants`
--

INSERT INTO `presences_enseignants` (`id`, `creneau_id`, `enseignant_id`, `date_cours`, `statut`, `scanned_at`, `mode_pointage`, `token`, `ip_address`, `user_agent`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '2026-05-06', 'retard', '2026-05-06 15:30:40', 'qr', '5785ff359822a5c48756786263e56401f908fbef7f490272', '192.168.11.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 15:30:40', '2026-05-06 15:30:40'),
(2, 1, 1, '2026-05-07', 'retard', '2026-05-07 11:53:57', 'qr', 'ada81d81c128b33df508963e76d12dd2965d2287a88d43d8', '192.168.11.103', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1', '2026-05-07 11:53:57', '2026-05-07 11:53:57'),
(3, 22, 11, '2026-05-07', 'retard', '2026-05-07 11:54:31', 'qr', 'fd0e7e8b7963bf868866bbe99f1214f2de23cc66d59adfc1', '192.168.11.103', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1', '2026-05-07 11:54:31', '2026-05-07 11:54:31'),
(4, 30, 4, '2026-05-11', 'retard', '2026-05-12 12:23:33', 'qr', '493715a8c5aa8732cc79e45c2562a84d9f8be3e9692b5565', '192.168.11.105', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1', '2026-05-12 12:23:33', '2026-05-12 12:23:33');

-- --------------------------------------------------------

--
-- Structure de la table `presences_professeurs`
--

DROP TABLE IF EXISTS `presences_professeurs`;
CREATE TABLE IF NOT EXISTS `presences_professeurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token_id` int DEFAULT NULL,
  `creneau_id` int NOT NULL,
  `enseignant_id` int NOT NULL,
  `date_cours` date NOT NULL,
  `statut` enum('present','retard','absent') NOT NULL DEFAULT 'present',
  `scanned_at` datetime NOT NULL,
  `device_info` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_presence_course_teacher_date` (`creneau_id`,`enseignant_id`,`date_cours`),
  KEY `token_id` (`token_id`),
  KEY `creneau_id` (`creneau_id`),
  KEY `enseignant_id` (`enseignant_id`),
  KEY `date_cours` (`date_cours`),
  KEY `statut` (`statut`),
  KEY `scanned_at` (`scanned_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `presences_professeurs`
--

INSERT INTO `presences_professeurs` (`id`, `token_id`, `creneau_id`, `enseignant_id`, `date_cours`, `statut`, `scanned_at`, `device_info`, `created_at`) VALUES
(1, 2, 32, 5, '2026-05-12', 'present', '2026-05-12 12:32:49', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1', '2026-05-12 12:32:49'),
(2, 3, 36, 8, '2026-05-12', 'present', '2026-05-12 13:28:59', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1', '2026-05-12 13:28:59'),
(3, 5, 37, 1, '2026-05-12', 'present', '2026-05-12 14:00:54', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1', '2026-05-12 14:00:54'),
(4, NULL, 31, 18, '2026-05-12', 'retard', '2026-05-12 15:18:55', 'Pointage manuel par surveillant@isge.bf', '2026-05-12 15:18:55'),
(5, NULL, 1, 1, '2026-05-11', 'present', '2026-05-13 08:31:02', 'Pointage manuel par admin@isge.bf', '2026-05-13 07:57:13'),
(7, 7, 4, 3, '2026-05-13', 'present', '2026-05-13 09:56:07', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1', '2026-05-13 09:56:07');

-- --------------------------------------------------------

--
-- Structure de la table `qr_cours_tokens`
--

DROP TABLE IF EXISTS `qr_cours_tokens`;
CREATE TABLE IF NOT EXISTS `qr_cours_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(100) NOT NULL,
  `creneau_id` int NOT NULL,
  `date_cours` date NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(120) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_qr_token` (`token`),
  KEY `idx_qr_creneau` (`creneau_id`),
  KEY `idx_qr_date` (`date_cours`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `qr_cours_tokens`
--

INSERT INTO `qr_cours_tokens` (`id`, `token`, `creneau_id`, `date_cours`, `expires_at`, `used_at`, `actif`, `created_by`, `created_at`) VALUES
(1, '1fb7bccf5596f6a6208adffe80d2a6a0d96f1046dd99231e', 1, '2026-05-06', '2026-05-06 18:22:59', NULL, 1, 'admin@isge.bf', '2026-05-06 15:22:59'),
(2, '5785ff359822a5c48756786263e56401f908fbef7f490272', 1, '2026-05-06', '2026-05-06 15:56:46', '2026-05-06 15:30:40', 1, 'admin@isge.bf', '2026-05-06 15:26:46'),
(3, 'ada81d81c128b33df508963e76d12dd2965d2287a88d43d8', 1, '2026-05-07', '2026-05-07 12:08:12', '2026-05-07 11:53:57', 1, 'admin@isge.bf', '2026-05-07 11:38:12'),
(4, 'fd0e7e8b7963bf868866bbe99f1214f2de23cc66d59adfc1', 22, '2026-05-07', '2026-05-07 12:24:21', '2026-05-07 11:54:31', 1, 'admin@isge.bf', '2026-05-07 11:54:21'),
(5, 'aed591f557c7d9fd221d797f4699ff5f0475c42a814dd673', 23, '2026-05-07', '2026-05-07 14:55:11', NULL, 1, 'admin@isge.bf', '2026-05-07 11:55:11'),
(6, '493715a8c5aa8732cc79e45c2562a84d9f8be3e9692b5565', 30, '2026-05-11', '2026-05-12 15:23:11', '2026-05-12 12:23:33', 1, 'admin@isge.bf', '2026-05-12 12:23:11');

-- --------------------------------------------------------

--
-- Structure de la table `salles`
--

DROP TABLE IF EXISTS `salles`;
CREATE TABLE IF NOT EXISTS `salles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) DEFAULT NULL,
  `capacite` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nom` (`nom`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `salles`
--

INSERT INTO `salles` (`id`, `nom`, `capacite`) VALUES
(1, 'A101', 60),
(2, 'A102', 60),
(3, 'B201', 45),
(4, 'B202', 45),
(5, 'C301', 35),
(6, 'Labo Réseaux', 30);

-- --------------------------------------------------------

--
-- Structure de la table `signatures`
--

DROP TABLE IF EXISTS `signatures`;
CREATE TABLE IF NOT EXISTS `signatures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cahier_id` int DEFAULT NULL,
  `nom_signataire` varchar(100) DEFAULT NULL,
  `role` enum('enseignant','delegue') DEFAULT NULL,
  `signature` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cahier_id` (`cahier_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `teacher_qr_tokens`
--

DROP TABLE IF EXISTS `teacher_qr_tokens`;
CREATE TABLE IF NOT EXISTS `teacher_qr_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(100) NOT NULL,
  `creneau_id` int NOT NULL,
  `date_cours` date NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_by` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `token_2` (`token`),
  KEY `creneau_id` (`creneau_id`),
  KEY `date_cours` (`date_cours`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `teacher_qr_tokens`
--

INSERT INTO `teacher_qr_tokens` (`id`, `token`, `creneau_id`, `date_cours`, `expires_at`, `created_by`, `created_at`) VALUES
(1, 'a7ecdc99fbcafcbaaad2f0a6ad9a66eacd71a144e647feca', 18, '2026-05-12', '2026-05-12 15:30:31', 'admin@isge.bf', '2026-05-12 12:30:31'),
(2, 'd14fe45ce619852ac60e87b0710499ff7b0f2c18e5d564e2', 32, '2026-05-12', '2026-05-12 15:32:40', 'admin@isge.bf', '2026-05-12 12:32:40'),
(3, '8f14bd284172f200853e7294104815e63cfbaf377916f1f7', 36, '2026-05-12', '2026-05-12 17:27:57', 'admin@isge.bf', '2026-05-12 13:27:57'),
(4, '3d6dc5754984d659caee393f145398fff8275a5568e8ba10', 36, '2026-04-28', '2026-05-12 17:30:03', 'admin@isge.bf', '2026-05-12 13:30:03'),
(5, '91410c0cb05f62dd6e3f8e627079275beec8bb53b9719237', 37, '2026-05-12', '2026-05-12 18:00:42', 'admin@isge.bf', '2026-05-12 14:00:42'),
(6, 'a401c1512b979a51263fdfc01237ba2dda9a65dec5bcc91a', 1, '2026-05-11', '2026-05-12 19:26:13', 'surveillant@isge.bf', '2026-05-12 15:26:13'),
(7, '5c3f8e4e1b2e6aca347d70d1d60bb7e435cc09a38d97474c', 4, '2026-05-13', '2026-05-13 13:55:52', 'admin@isge.bf', '2026-05-13 09:55:52');

-- --------------------------------------------------------

--
-- Structure de la table `utilisateurs`
--

DROP TABLE IF EXISTS `utilisateurs`;
CREATE TABLE IF NOT EXISTS `utilisateurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `nom` varchar(100) DEFAULT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('admin','enseignant','delegue','surveillant','comptable') NOT NULL DEFAULT 'enseignant',
  `id_lien` int DEFAULT NULL,
  `type_lien` enum('enseignant','classe','admin','surveillant','comptable') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `password` varchar(255) NOT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `utilisateurs`
--

INSERT INTO `utilisateurs` (`id`, `email`, `nom`, `prenom`, `mot_de_passe`, `role`, `id_lien`, `type_lien`, `created_at`, `password`, `actif`) VALUES
(2, 'admin@isge.bf', 'Administrateur', 'ISGE', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og5c6YQd6Pz7K9aK', 'admin', NULL, 'admin', '2026-05-01 05:43:57', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(3, 'jean.traore@isge.bf', 'TRAORE', 'Jean', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og5c6YQd6Pz7K9aK', 'enseignant', 11, 'enseignant', '2026-05-01 05:43:57', '', 1),
(4, 'paul.kabore@isge.bf', 'KABORE', 'Paul', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og5c6YQd6Pz7K9aK', 'enseignant', 12, 'enseignant', '2026-05-01 05:43:57', '', 1),
(5, 'delegue.l1@isge.bf', 'Délégué', 'Licence 1 RIT', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og5c6YQd6Pz7K9aK', 'delegue', 1, 'classe', '2026-05-01 05:43:57', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(6, 'delegue.l2@isge.bf', 'Délégué', 'Licence 2 RIT', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og5c6YQd6Pz7K9aK', 'delegue', 2, 'classe', '2026-05-01 05:43:57', '', 1),
(7, 'surveillant@isge.bf', 'Surveillant', 'ISGE', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og5c6YQd6Pz7K9aK', 'surveillant', NULL, 'surveillant', '2026-05-01 05:43:57', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(8, 'comptable@isge.bf', 'Comptable', 'ISGE', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og5c6YQd6Pz7K9aK', 'comptable', NULL, 'comptable', '2026-05-01 05:43:57', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(9, 'enseignant@isge.bf', NULL, NULL, '', 'enseignant', NULL, NULL, '2026-05-05 04:12:01', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 0),
(10, 'traore@isge.bf', 'TRAORE', 'Jean', '', 'enseignant', 11, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(11, 'kabore@isge.bf', 'KABORE', 'Paul', '', 'enseignant', 12, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(12, 'ouedraogo@isge.bf', 'OUEDRAOGO', 'Issa', '', 'enseignant', 13, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(13, 'sankara@isge.bf', 'SANKARA', 'Mariam', '', 'enseignant', 14, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(14, 'compaore@isge.bf', 'COMPAORE', 'Adama', '', 'enseignant', 15, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(15, 'sawadogo@isge.bf', 'SAWADOGO', 'Ibrahim', '', 'enseignant', 16, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(16, 'nikiema@isge.bf', 'NIKIEMA', 'Salif', '', 'enseignant', 17, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1),
(17, 'zongo@isge.bf', 'ZONGO', 'Aristide', '', 'enseignant', 18, 'enseignant', '2026-05-05 05:06:12', '$2y$10$HUGJusXyR/qx239EVZySPe0pyrMvrKBEFg5QLn1GkQfykG8fOblMO', 1);

-- --------------------------------------------------------

--
-- Structure de la table `vacations`
--

DROP TABLE IF EXISTS `vacations`;
CREATE TABLE IF NOT EXISTS `vacations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enseignant_id` int DEFAULT NULL,
  `mois` varchar(20) DEFAULT NULL,
  `montant` decimal(10,2) DEFAULT NULL,
  `statut` enum('en_attente','valide','refuse') DEFAULT 'en_attente',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `enseignant_id` (`enseignant_id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `vacations`
--

INSERT INTO `vacations` (`id`, `enseignant_id`, `mois`, `montant`, `statut`, `created_at`) VALUES
(1, 1, 'Avril 2025', 200000.00, 'valide', '2026-05-01 06:15:17');

-- --------------------------------------------------------

--
-- Structure de la table `vacation_lignes`
--

DROP TABLE IF EXISTS `vacation_lignes`;
CREATE TABLE IF NOT EXISTS `vacation_lignes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vacation_id` int DEFAULT NULL,
  `creneau_id` int DEFAULT NULL,
  `heures` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vacation_id` (`vacation_id`),
  KEY `creneau_id` (`creneau_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
