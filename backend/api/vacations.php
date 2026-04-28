<?php
// ============================================================
//  EduSchedule Pro — API Vacations
//  Auteur : Bechir
//  Endpoints : GET  /api/vacations
//              GET  /api/vacations?id=X
//              POST /api/vacations?action=generer
//              POST /api/vacations?id=X&action=valider
//              POST /api/vacations?id=X&action=approuver
//              GET  /api/vacations?id=X&action=pdf
// ============================================================

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = new Database();
$conn   = $db->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'GET':
        Auth::proteger(['admin', 'enseignant', 'surveillant', 'comptable']);
        if ($id && $action === 'pdf') genererPDF($conn, $id);
        elseif ($id) detailVacation($conn, $id);
        else listerVacations($conn);
        break;

    case 'POST':
        if ($action === 'generer') {
            Auth::proteger(['admin', 'comptable']);
            genererVacation($conn);
        } elseif ($id && $action === 'valider') {
            Auth::proteger(['surveillant']);
            validerVacation($conn, $id);
        } elseif ($id && $action === 'approuver') {
            Auth::proteger(['comptable']);
            approuverVacation($conn, $id);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Action invalide']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  LISTER les fiches de vacation
// ============================================================
function listerVacations($conn) {
    $id_enseignant = $_GET['id_enseignant'] ?? null;
    $mois          = $_GET['mois']          ?? null;
    $annee         = $_GET['annee']         ?? null;
    $statut        = $_GET['statut']        ?? null;

    $sql = "
        SELECT 
            v.*,
            e.nom      AS enseignant_nom,
            e.prenom   AS enseignant_prenom,
            e.matricule,
            e.specialite
        FROM vacations v
        JOIN enseignants e ON v.id_enseignant = e.id
        WHERE 1=1
    ";
    $params = [];

    if ($id_enseignant) {
        $sql .= " AND v.id_enseignant = :id_enseignant";
        $params[':id_enseignant'] = $id_enseignant;
    }
    if ($mois) {
        $sql .= " AND v.mois = :mois";
        $params[':mois'] = $mois;
    }
    if ($annee) {
        $sql .= " AND v.annee = :annee";
        $params[':annee'] = $annee;
    }
    if ($statut) {
        $sql .= " AND v.statut = :statut";
        $params[':statut'] = $statut;
    }

    $sql .= " ORDER BY v.annee DESC, v.mois DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $vacations = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data'    => $vacations,
        'total'   => count($vacations)
    ]);
}

// ============================================================
//  DÉTAIL d'une fiche de vacation
// ============================================================
function detailVacation($conn, $id) {
    // Récupérer l'en-tête
    $stmt = $conn->prepare("
        SELECT 
            v.*,
            e.nom        AS enseignant_nom,
            e.prenom     AS enseignant_prenom,
            e.matricule,
            e.specialite,
            e.taux_horaire
        FROM vacations v
        JOIN enseignants e ON v.id_enseignant = e.id
        WHERE v.id = :id
    ");
    $stmt->execute([':id' => $id]);
    $vacation = $stmt->fetch();

    if (!$vacation) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fiche de vacation introuvable']);
        return;
    }

    // Récupérer les lignes de détail
    $stmt2 = $conn->prepare("
        SELECT 
            vl.*,
            ct.titre_cours,
            ct.heure_fin_reelle,
            cr.jour, cr.heure_debut, cr.heure_fin,
            m.libelle  AS matiere,
            cl.libelle AS classe
        FROM vacation_lignes vl
        JOIN cahiers_texte ct ON vl.id_creneau  = ct.id_creneau
        JOIN creneaux      cr ON vl.id_creneau  = cr.id
        JOIN matieres      m  ON cr.id_matiere  = m.id
        JOIN emploi_temps  et ON cr.id_emploi_temps = et.id
        JOIN classes       cl ON et.id_classe   = cl.id
        WHERE vl.id_vacation = :id
        ORDER BY cr.jour, cr.heure_debut
    ");
    $stmt2->execute([':id' => $id]);
    $vacation['lignes'] = $stmt2->fetchAll();

    // Récupérer les validations
    $stmt3 = $conn->prepare("
        SELECT val.*, u.email, u.role
        FROM validations val
        JOIN utilisateurs u ON val.id_validateur = u.id
        WHERE val.id_vacation = :id
        ORDER BY val.date_validation ASC
    ");
    $stmt3->execute([':id' => $id]);
    $vacation['validations'] = $stmt3->fetchAll();

    echo json_encode(['success' => true, 'data' => $vacation]);
}

// ============================================================
//  GÉNÉRER une fiche de vacation automatiquement
// ============================================================
function genererVacation($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id_enseignant']) || empty($data['mois']) || empty($data['annee'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'id_enseignant, mois et annee sont requis'
        ]);
        return;
    }

    // Vérifier qu'une fiche n'existe pas déjà
    $stmt = $conn->prepare("
        SELECT id FROM vacations 
        WHERE id_enseignant = :id AND mois = :mois AND annee = :annee
    ");
    $stmt->execute([
        ':id'   => $data['id_enseignant'],
        ':mois' => $data['mois'],
        ':annee'=> $data['annee']
    ]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Une fiche de vacation existe déjà pour ce mois'
        ]);
        return;
    }

    // Récupérer le taux horaire de l'enseignant
    $stmt = $conn->prepare("SELECT taux_horaire FROM enseignants WHERE id = :id");
    $stmt->execute([':id' => $data['id_enseignant']]);
    $enseignant = $stmt->fetch();

    if (!$enseignant) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Enseignant introuvable']);
        return;
    }

    $taux = $enseignant['taux_horaire'];

    // Récupérer toutes les séances clôturées du mois
    $stmt = $conn->prepare("
        SELECT 
            ct.id         AS id_cahier,
            ct.id_creneau,
            ct.heure_fin_reelle,
            p.heure_pointage_reelle,
            cr.heure_debut,
            cr.heure_fin
        FROM cahiers_texte ct
        JOIN creneaux     cr ON ct.id_creneau    = cr.id
        JOIN pointages    p  ON p.id_creneau     = cr.id AND p.statut != 'invalide'
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        WHERE cr.id_enseignant = :id_enseignant
          AND ct.statut        = 'cloture'
          AND MONTH(ct.date_creation) = :mois
          AND YEAR(ct.date_creation)  = :annee
    ");
    $stmt->execute([
        ':id_enseignant' => $data['id_enseignant'],
        ':mois'          => $data['mois'],
        ':annee'         => $data['annee']
    ]);
    $seances = $stmt->fetchAll();

    if (empty($seances)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Aucune séance clôturée trouvée pour ce mois'
        ]);
        return;
    }

    // Calculer les montants
    $total_heures  = 0;
    $total_montant = 0;
    $lignes        = [];

    foreach ($seances as $seance) {
        // Calculer la durée réelle
        $debut = $seance['heure_pointage_reelle']
            ? strtotime($seance['heure_pointage_reelle'])
            : strtotime($seance['heure_debut']);

        $fin = $seance['heure_fin_reelle']
            ? strtotime($seance['heure_fin_reelle'])
            : strtotime($seance['heure_fin']);

        $duree_secondes = $fin - $debut;
        $duree_heures   = round($duree_secondes / 3600, 2);

        // Sécurité : durée max = durée planifiée + 30 min
        $duree_planifiee = round(
            (strtotime($seance['heure_fin']) - strtotime($seance['heure_debut'])) / 3600, 2
        );
        if ($duree_heures > $duree_planifiee + 0.5) {
            $duree_heures = $duree_planifiee;
        }

        $montant        = round($duree_heures * $taux);
        $total_heures  += $duree_heures;
        $total_montant += $montant;

        $lignes[] = [
            'id_creneau'   => $seance['id_creneau'],
            'duree_heures' => $duree_heures,
            'taux'         => $taux,
            'montant'      => $montant
        ];
    }

    $conn->beginTransaction();
    try {
        // Créer la fiche de vacation
        $stmt = $conn->prepare("
            INSERT INTO vacations 
                (id_enseignant, mois, annee, montant_brut, montant_net, statut, date_generation)
            VALUES 
                (:id_enseignant, :mois, :annee, :montant_brut, :montant_net, 'generee', NOW())
        ");
        $stmt->execute([
            ':id_enseignant' => $data['id_enseignant'],
            ':mois'          => $data['mois'],
            ':annee'         => $data['annee'],
            ':montant_brut'  => $total_montant,
            ':montant_net'   => $total_montant  // Retenues à 0 par défaut
        ]);
        $id_vacation = $conn->lastInsertId();

        // Insérer les lignes de détail
        $stmt2 = $conn->prepare("
            INSERT INTO vacation_lignes (id_vacation, id_creneau, duree_heures, taux, montant)
            VALUES (:id_vacation, :id_creneau, :duree, :taux, :montant)
        ");
        foreach ($lignes as $ligne) {
            $stmt2->execute([
                ':id_vacation' => $id_vacation,
                ':id_creneau'  => $ligne['id_creneau'],
                ':duree'       => $ligne['duree_heures'],
                ':taux'        => $ligne['taux'],
                ':montant'     => $ligne['montant']
            ]);
        }

        $conn->commit();

        http_response_code(201);
        echo json_encode([
            'success'      => true,
            'message'      => '✅ Fiche de vacation générée avec succès',
            'id_vacation'  => $id_vacation,
            'total_heures' => $total_heures,
            'montant_brut' => $total_montant,
            'nb_seances'   => count($seances)
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

// ============================================================
//  VALIDER une fiche (surveillant)
// ============================================================
function validerVacation($conn, $id) {
    $user = Auth::proteger(['surveillant']);
    $data = json_decode(file_get_contents('php://input'), true);

    $stmt = $conn->prepare("SELECT statut FROM vacations WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $vacation = $stmt->fetch();

    if (!$vacation) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fiche introuvable']);
        return;
    }

    if ($vacation['statut'] !== 'generee') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'La fiche doit être au statut "generee" pour être validée'
        ]);
        return;
    }

    $conn->beginTransaction();
    try {
        $conn->prepare("UPDATE vacations SET statut = 'validee' WHERE id = :id")
             ->execute([':id' => $id]);

        $conn->prepare("
            INSERT INTO validations 
                (id_vacation, id_validateur, role_validateur, visa_base64, date_validation, commentaire)
            VALUES (:id_vacation, :id_val, 'surveillant', :visa, NOW(), :commentaire)
        ")->execute([
            ':id_vacation'  => $id,
            ':id_val'       => $user['id'],
            ':visa'         => $data['visa_base64']   ?? null,
            ':commentaire'  => $data['commentaire']   ?? null
        ]);

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => '✅ Fiche validée par le surveillant'
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

// ============================================================
//  APPROUVER une fiche (comptable)
// ============================================================
function approuverVacation($conn, $id) {
    $user = Auth::proteger(['comptable']);
    $data = json_decode(file_get_contents('php://input'), true);

    $stmt = $conn->prepare("SELECT statut FROM vacations WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $vacation = $stmt->fetch();

    if (!$vacation) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fiche introuvable']);
        return;
    }

    if ($vacation['statut'] !== 'validee') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'La fiche doit être validée par le surveillant avant approbation comptable'
        ]);
        return;
    }

    $conn->beginTransaction();
    try {
        $conn->prepare("UPDATE vacations SET statut = 'approuvee' WHERE id = :id")
             ->execute([':id' => $id]);

        $conn->prepare("
            INSERT INTO validations 
                (id_vacation, id_validateur, role_validateur, visa_base64, date_validation, commentaire)
            VALUES (:id_vacation, :id_val, 'comptable', :visa, NOW(), :commentaire)
        ")->execute([
            ':id_vacation'  => $id,
            ':id_val'       => $user['id'],
            ':visa'         => $data['visa_base64']  ?? null,
            ':commentaire'  => $data['commentaire']  ?? null
        ]);

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => '✅ Fiche approuvée — paiement autorisé'
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur : ' . $e->getMessage()]);
    }
}

// ============================================================
//  GÉNÉRER le PDF de la fiche
// ============================================================
function genererPDF($conn, $id) {
    $stmt = $conn->prepare("
        SELECT 
            v.*,
            e.nom, e.prenom, e.matricule, e.specialite, e.taux_horaire
        FROM vacations v
        JOIN enseignants e ON v.id_enseignant = e.id
        WHERE v.id = :id
    ");
    $stmt->execute([':id' => $id]);
    $vacation = $stmt->fetch();

    if (!$vacation) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fiche introuvable']);
        return;
    }

    $stmt2 = $conn->prepare("
        SELECT vl.*, m.libelle AS matiere, cl.libelle AS classe, cr.jour
        FROM vacation_lignes vl
        JOIN creneaux     cr ON vl.id_creneau      = cr.id
        JOIN matieres     m  ON cr.id_matiere       = m.id
        JOIN emploi_temps et ON cr.id_emploi_temps  = et.id
        JOIN classes      cl ON et.id_classe        = cl.id
        WHERE vl.id_vacation = :id
    ");
    $stmt2->execute([':id' => $id]);
    $lignes = $stmt2->fetchAll();

    // Retourner les données JSON pour que le frontend génère le PDF
    echo json_encode([
        'success'  => true,
        'vacation' => $vacation,
        'lignes'   => $lignes
    ]);
}