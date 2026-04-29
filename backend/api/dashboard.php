<?php
// ============================================================
//  EduSchedule Pro — API Dashboard & Statistiques
//  Auteur : Bechir
//  Endpoint : GET /api/dashboard.php?role=admin&periode=semaine
// ============================================================

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db   = new Database();
$conn = $db->getConnection();

$user    = Auth::proteger(['admin', 'enseignant', 'delegue', 'surveillant', 'comptable']);
$role    = $_GET['role']    ?? $user['role'];
$periode = $_GET['periode'] ?? 'semaine';

switch ($role) {
    case 'admin':
    case 'surveillant':
        dashboardAdmin($conn, $periode);
        break;
    case 'enseignant':
        dashboardEnseignant($conn, $user['id']);
        break;
    case 'delegue':
        dashboardDelegue($conn, $user['id']);
        break;
    case 'comptable':
        dashboardComptable($conn);
        break;
    default:
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Rôle non autorisé']);
}

// ============================================================
//  DASHBOARD ADMIN / SURVEILLANT
// ============================================================
function dashboardAdmin($conn, $periode) {
    $stats = [];

    // 1. Séances du jour
    $stats['seances_aujourd_hui'] = [];
    $stmt = $conn->prepare("
        SELECT 
            cr.id, cr.jour, cr.heure_debut, cr.heure_fin,
            m.libelle  AS matiere,
            e.nom      AS enseignant_nom,
            e.prenom   AS enseignant_prenom,
            cl.libelle AS classe,
            s.libelle  AS salle,
            p.statut   AS statut_pointage
        FROM creneaux cr
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        JOIN matieres     m  ON cr.id_matiere      = m.id
        JOIN enseignants  e  ON cr.id_enseignant   = e.id
        JOIN classes      cl ON et.id_classe       = cl.id
        JOIN salles       s  ON cr.id_salle        = s.id
        LEFT JOIN pointages p ON p.id_creneau      = cr.id AND p.statut != 'invalide'
        WHERE cr.jour = :jour
          AND et.statut_publication = 'publie'
        ORDER BY cr.heure_debut
    ");
    $jours_fr = ['Monday'=>'Lundi','Tuesday'=>'Mardi','Wednesday'=>'Mercredi',
                 'Thursday'=>'Jeudi','Friday'=>'Vendredi','Saturday'=>'Samedi'];
    $jour_actuel = $jours_fr[date('l')] ?? 'Lundi';
    $stmt->execute([':jour' => $jour_actuel]);
    $stats['seances_aujourd_hui'] = $stmt->fetchAll();

    // 2. Compteurs globaux
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM classes");
    $stmt->execute();
    $stats['total_classes'] = $stmt->fetch()['total'];

    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM enseignants");
    $stmt->execute();
    $stats['total_enseignants'] = $stmt->fetch()['total'];

    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM creneaux");
    $stmt->execute();
    $stats['total_creneaux'] = $stmt->fetch()['total'];

    // 3. Taux de pointage (séances pointées vs total)
    $stmt = $conn->prepare("SELECT COUNT(DISTINCT id_creneau) as total FROM pointages WHERE statut != 'invalide'");
    $stmt->execute();
    $total_pointes = $stmt->fetch()['total'];

    $stats['taux_pointage'] = $stats['total_creneaux'] > 0
        ? round(($total_pointes / $stats['total_creneaux']) * 100, 1)
        : 0;

    // 4. Alertes — séances non pointées aujourd'hui
    $stats['alertes'] = [];
    foreach ($stats['seances_aujourd_hui'] as $seance) {
        if (empty($seance['statut_pointage'])) {
            $heure_prevue  = strtotime($seance['heure_debut']);
            $maintenant    = time();
            if ($maintenant > $heure_prevue + (RETARD_ALERTE_MINUTES * 60)) {
                $stats['alertes'][] = [
                    'type'       => 'absence',
                    'message'    => $seance['enseignant_prenom'] . ' ' . $seance['enseignant_nom'] .
                                    ' — ' . $seance['matiere'] . ' (' . $seance['classe'] . ')',
                    'heure'      => $seance['heure_debut']
                ];
            }
        }
        if ($seance['statut_pointage'] === 'retard') {
            $stats['alertes'][] = [
                'type'    => 'retard',
                'message' => $seance['enseignant_prenom'] . ' ' . $seance['enseignant_nom'] .
                             ' en retard — ' . $seance['matiere'],
                'heure'   => $seance['heure_debut']
            ];
        }
    }

    // 5. Cahiers non signés
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total FROM cahiers_texte 
        WHERE statut IN ('brouillon', 'signe_delegue')
    ");
    $stmt->execute();
    $stats['cahiers_non_signes'] = $stmt->fetch()['total'];

    // 6. Vacations en attente
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total FROM vacations WHERE statut = 'generee'
    ");
    $stmt->execute();
    $stats['vacations_en_attente'] = $stmt->fetch()['total'];

    // 7. Statistiques hebdomadaires
    $stmt = $conn->prepare("
        SELECT 
            COUNT(ct.id)                    AS seances_realisees,
            COUNT(DISTINCT cr.id_enseignant) AS enseignants_actifs
        FROM cahiers_texte ct
        JOIN creneaux cr ON ct.id_creneau = cr.id
        WHERE ct.date_creation >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $stmt->execute();
    $stats['semaine'] = $stmt->fetch();

    echo json_encode(['success' => true, 'role' => 'admin', 'data' => $stats]);
}

// ============================================================
//  DASHBOARD ENSEIGNANT
// ============================================================
function dashboardEnseignant($conn, $id_user) {
    // Trouver l'enseignant lié à ce compte
    $stmt = $conn->prepare("SELECT id_lien FROM utilisateurs WHERE id = :id");
    $stmt->execute([':id' => $id_user]);
    $user = $stmt->fetch();
    $id_enseignant = $user['id_lien'] ?? null;

    if (!$id_enseignant) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Enseignant introuvable']);
        return;
    }

    $stats = [];

    // Séances de la semaine
    $stmt = $conn->prepare("
        SELECT 
            cr.id, cr.jour, cr.heure_debut, cr.heure_fin,
            m.libelle  AS matiere,
            cl.libelle AS classe,
            s.libelle  AS salle,
            p.statut   AS statut_pointage,
            ct.statut  AS statut_cahier
        FROM creneaux cr
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        JOIN matieres     m  ON cr.id_matiere      = m.id
        JOIN classes      cl ON et.id_classe       = cl.id
        JOIN salles       s  ON cr.id_salle        = s.id
        LEFT JOIN pointages    p  ON p.id_creneau  = cr.id AND p.statut != 'invalide'
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = cr.id
        WHERE cr.id_enseignant = :id_enseignant
          AND et.statut_publication = 'publie'
        ORDER BY cr.jour, cr.heure_debut
    ");
    $stmt->execute([':id_enseignant' => $id_enseignant]);
    $stats['mes_seances'] = $stmt->fetchAll();

    // Mes fiches de vacation
    $stmt = $conn->prepare("
        SELECT id, mois, annee, montant_brut, montant_net, statut
        FROM vacations
        WHERE id_enseignant = :id
        ORDER BY annee DESC, mois DESC
        LIMIT 6
    ");
    $stmt->execute([':id' => $id_enseignant]);
    $stats['mes_vacations'] = $stmt->fetchAll();

    // Total heures ce mois
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(vl.duree_heures), 0) as total_heures
        FROM vacation_lignes vl
        JOIN vacations v ON vl.id_vacation = v.id
        WHERE v.id_enseignant = :id
          AND v.mois  = MONTH(NOW())
          AND v.annee = YEAR(NOW())
    ");
    $stmt->execute([':id' => $id_enseignant]);
    $stats['heures_ce_mois'] = $stmt->fetch()['total_heures'];

    echo json_encode(['success' => true, 'role' => 'enseignant', 'data' => $stats]);
}

// ============================================================
//  DASHBOARD DÉLÉGUÉ
// ============================================================
function dashboardDelegue($conn, $id_user) {
    $stats = [];

    // Trouver la classe du délégué via son compte
    $stmt = $conn->prepare("SELECT id_lien FROM utilisateurs WHERE id = :id");
    $stmt->execute([':id' => $id_user]);
    $user = $stmt->fetch();

    // Emploi du temps de la semaine pour sa classe
    $stmt = $conn->prepare("
        SELECT 
            cr.id, cr.jour, cr.heure_debut, cr.heure_fin,
            m.libelle  AS matiere,
            e.nom      AS enseignant_nom,
            e.prenom   AS enseignant_prenom,
            s.libelle  AS salle,
            ct.id      AS id_cahier,
            ct.statut  AS statut_cahier
        FROM creneaux cr
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        JOIN matieres     m  ON cr.id_matiere      = m.id
        JOIN enseignants  e  ON cr.id_enseignant   = e.id
        JOIN salles       s  ON cr.id_salle        = s.id
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = cr.id
        WHERE et.statut_publication = 'publie'
        ORDER BY cr.jour, cr.heure_debut
    ");
    $stmt->execute();
    $stats['emploi_du_temps'] = $stmt->fetchAll();

    // Cahiers à remplir (séances pointées sans cahier)
    $stmt = $conn->prepare("
        SELECT 
            cr.id AS id_creneau, cr.jour, cr.heure_debut,
            m.libelle AS matiere,
            e.nom AS enseignant_nom,
            p.heure_pointage_reelle
        FROM pointages p
        JOIN creneaux     cr ON p.id_creneau   = cr.id
        JOIN matieres     m  ON cr.id_matiere  = m.id
        JOIN enseignants  e  ON cr.id_enseignant = e.id
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = cr.id
        WHERE p.statut != 'invalide'
          AND ct.id IS NULL
        ORDER BY p.heure_pointage_reelle DESC
    ");
    $stmt->execute();
    $stats['cahiers_a_remplir'] = $stmt->fetchAll();

    // Historique des cahiers signés
    $stmt = $conn->prepare("
        SELECT 
            ct.id, ct.titre_cours, ct.statut, ct.date_creation,
            m.libelle AS matiere
        FROM cahiers_texte ct
        JOIN creneaux cr ON ct.id_creneau = cr.id
        JOIN matieres m  ON cr.id_matiere = m.id
        WHERE ct.id_delegue = :id
        ORDER BY ct.date_creation DESC
        LIMIT 10
    ");
    $stmt->execute([':id' => $id_user]);
    $stats['historique_cahiers'] = $stmt->fetchAll();

    echo json_encode(['success' => true, 'role' => 'delegue', 'data' => $stats]);
}

// ============================================================
//  DASHBOARD COMPTABLE
// ============================================================
function dashboardComptable($conn) {
    $stats = [];

    // Vacations par statut
    $stmt = $conn->prepare("
        SELECT statut, COUNT(*) as total, SUM(montant_net) as montant_total
        FROM vacations
        GROUP BY statut
    ");
    $stmt->execute();
    $stats['vacations_par_statut'] = $stmt->fetchAll();

    // Top enseignants ce mois
    $stmt = $conn->prepare("
        SELECT 
            e.nom, e.prenom, e.matricule,
            v.montant_net,
            v.statut
        FROM vacations v
        JOIN enseignants e ON v.id_enseignant = e.id
        WHERE v.mois = MONTH(NOW()) AND v.annee = YEAR(NOW())
        ORDER BY v.montant_net DESC
    ");
    $stmt->execute();
    $stats['vacations_ce_mois'] = $stmt->fetchAll();

    // Montant total à payer
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(montant_net), 0) as total
        FROM vacations
        WHERE statut = 'approuvee'
          AND mois  = MONTH(NOW())
          AND annee = YEAR(NOW())
    ");
    $stmt->execute();
    $stats['montant_a_payer'] = $stmt->fetch()['total'];

    echo json_encode(['success' => true, 'role' => 'comptable', 'data' => $stats]);
}