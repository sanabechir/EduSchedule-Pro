<?php
// ============================================================
//  EduSchedule Pro — API Pointages (Scan QR-Code)
//  Auteur : Bechir
//  Endpoints : POST /api/pointages/scan
//              GET  /api/pointages
// ============================================================

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = new Database();
$conn   = $db->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'POST':
        Auth::proteger(['enseignant', 'admin']);
        if ($action === 'scan') scanQR($conn);
        break;
    case 'GET':
        Auth::proteger(['admin', 'surveillant']);
        listerPointages($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  SCANNER le QR-Code et valider le pointage
// ============================================================
function scanQR($conn) {
    $user = Auth::proteger(['enseignant', 'admin']);
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['token_qr'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Token QR requis'
        ]);
        return;
    }

    $token = $data['token_qr'];

    // Vérifier que le token existe et n'a pas déjà été utilisé
    $stmt = $conn->prepare("
        SELECT cr.*, 
               et.semaine_debut,
               m.libelle  AS matiere,
               s.libelle  AS salle,
               e.nom      AS enseignant_nom,
               e.prenom   AS enseignant_prenom,
               e.id       AS enseignant_id
        FROM creneaux cr
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        JOIN matieres     m  ON cr.id_matiere      = m.id
        JOIN salles       s  ON cr.id_salle        = s.id
        JOIN enseignants  e  ON cr.id_enseignant   = e.id
        WHERE cr.qr_token = :token
    ");
    $stmt->execute([':token' => $token]);
    $creneau = $stmt->fetch();

    // Token invalide
    if (!$creneau) {
        // Logger la tentative échouée
        loggerTentative($conn, null, $token, 'invalide', $user['id']);
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'QR-Code invalide ou expiré'
        ]);
        return;
    }

    // Vérifier que le token n'a pas déjà été utilisé
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total FROM pointages 
        WHERE id_creneau = :id_creneau AND statut != 'invalide'
    ");
    $stmt->execute([':id_creneau' => $creneau['id']]);
    $row = $stmt->fetch();

    if ($row['total'] > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Ce créneau a déjà été pointé'
        ]);
        return;
    }

    // Calculer la date et heure prévue du créneau
    $jours = ['Lundi' => 0, 'Mardi' => 1, 'Mercredi' => 2, 
              'Jeudi' => 3, 'Vendredi' => 4, 'Samedi' => 5];
    $offset        = $jours[$creneau['jour']] ?? 0;
    $date_creneau  = date('Y-m-d', strtotime($creneau['semaine_debut'] . " +{$offset} days"));
    $heure_prevue  = strtotime($date_creneau . ' ' . $creneau['heure_debut']);
    $maintenant    = time();

    // Fenêtre de validité : ±15 minutes autour de l'heure prévue
    $fenetre       = QR_WINDOW_MINUTES * 60;
    $debut_fenetre = $heure_prevue - $fenetre;
    $fin_fenetre   = $heure_prevue + $fenetre;

    // Déterminer le statut
    if ($maintenant < $debut_fenetre) {
        $statut  = 'invalide';
        $message = 'Trop tôt — le pointage n\'est pas encore ouvert';
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => $message]);
        return;
    }

    if ($maintenant > $fin_fenetre) {
        $statut  = 'invalide';
        $message = 'Trop tard — la fenêtre de pointage est fermée';
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => $message]);
        return;
    }

    // Vérifier le retard (>= heure prévue + 30 min)
    $retard_seuil = $heure_prevue + (RETARD_ALERTE_MINUTES * 60);
    $statut       = ($maintenant > $retard_seuil) ? 'retard' : 'valide';

    // Enregistrer le pointage
    $stmt = $conn->prepare("
        INSERT INTO pointages 
            (id_creneau, id_enseignant, heure_pointage_reelle, ip_source, token_utilise, statut)
        VALUES 
            (:id_creneau, :id_enseignant, NOW(), :ip, :token, :statut)
    ");
    $stmt->execute([
        ':id_creneau'    => $creneau['id'],
        ':id_enseignant' => $creneau['enseignant_id'],
        ':ip'            => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
        ':token'         => $token,
        ':statut'        => $statut
    ]);

    // Invalider le QR-Code (usage unique)
    $stmt = $conn->prepare("UPDATE creneaux SET qr_token = NULL WHERE id = :id");
    $stmt->execute([':id' => $creneau['id']]);

    // Logger l'activité
    $stmt = $conn->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
        VALUES (:id, 'POINTAGE_QR', :details, :ip)
    ");
    $stmt->execute([
        ':id'      => $user['id'],
        ':details' => json_encode([
            'id_creneau' => $creneau['id'],
            'statut'     => $statut,
            'matiere'    => $creneau['matiere']
        ]),
        ':ip'      => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    ]);

    $message = $statut === 'retard'
        ? '⚠️ Pointage enregistré avec retard'
        : '✅ Pointage réussi !';

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => $message,
        'statut'  => $statut,
        'creneau' => [
            'matiere'     => $creneau['matiere'],
            'enseignant'  => $creneau['enseignant_prenom'] . ' ' . $creneau['enseignant_nom'],
            'salle'       => $creneau['salle'],
            'jour'        => $creneau['jour'],
            'heure_debut' => $creneau['heure_debut'],
            'heure_fin'   => $creneau['heure_fin'],
            'heure_reelle'=> date('H:i:s')
        ]
    ]);
}

// ============================================================
//  LISTER les pointages
// ============================================================
function listerPointages($conn) {
    $id_creneau = $_GET['id_creneau'] ?? null;
    $statut     = $_GET['statut']     ?? null;

    $sql = "
        SELECT 
            p.*,
            m.libelle  AS matiere,
            e.nom      AS enseignant_nom,
            e.prenom   AS enseignant_prenom,
            s.libelle  AS salle,
            cr.jour,
            cr.heure_debut
        FROM pointages   p
        JOIN creneaux    cr ON p.id_creneau    = cr.id
        JOIN matieres    m  ON cr.id_matiere   = m.id
        JOIN enseignants e  ON p.id_enseignant = e.id
        JOIN salles      s  ON cr.id_salle     = s.id
        WHERE 1=1
    ";
    $params = [];

    if ($id_creneau) {
        $sql .= " AND p.id_creneau = :id_creneau";
        $params[':id_creneau'] = $id_creneau;
    }

    if ($statut) {
        $sql .= " AND p.statut = :statut";
        $params[':statut'] = $statut;
    }

    $sql .= " ORDER BY p.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $pointages = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => $pointages,
        'total'   => count($pointages)
    ]);
}

// ============================================================
//  LOGGER une tentative échouée
// ============================================================
function loggerTentative($conn, $id_creneau, $token, $statut, $id_user) {
    try {
        $stmt = $conn->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (:id, 'SCAN_ECHOUE', :details, :ip)
        ");
        $stmt->execute([
            ':id'      => $id_user,
            ':details' => json_encode(['token' => substr($token, 0, 10) . '...', 'statut' => $statut]),
            ':ip'      => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
        ]);
    } catch (Exception $e) {
        // Silencieux
    }
}