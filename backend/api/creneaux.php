<?php
// ============================================================
//  EduSchedule Pro — API Créneaux & QR-Code
//  Auteur : Bechir
//  Endpoints : GET  /api/creneaux
//              GET  /api/creneaux?id={id}&action=qr
//              POST /api/creneaux
//              DELETE /api/creneaux/{id}
// ============================================================

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

$db     = new Database();
$conn   = $db->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'GET':
        Auth::proteger(['admin', 'enseignant', 'delegue', 'surveillant', 'etudiant']);
        if ($id && $action === 'qr') genererQR($conn, $id);
        else listerCreneaux($conn);
        break;
    case 'POST':
        Auth::proteger(['admin']);
        creerCreneau($conn);
        break;
    case 'DELETE':
        Auth::proteger(['admin']);
        supprimerCreneau($conn, $id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  LISTER les créneaux
// ============================================================
function listerCreneaux($conn) {
    $id_emploi = $_GET['id_emploi_temps'] ?? null;
    $id_classe  = $_GET['id_classe']       ?? null;

    $sql = "
        SELECT 
            cr.*,
            m.libelle  AS matiere_libelle,
            m.code     AS matiere_code,
            e.nom      AS enseignant_nom,
            e.prenom   AS enseignant_prenom,
            s.libelle  AS salle_libelle,
            s.code     AS salle_code
        FROM creneaux    cr
        JOIN matieres    m  ON cr.id_matiere    = m.id
        JOIN enseignants e  ON cr.id_enseignant = e.id
        JOIN salles      s  ON cr.id_salle      = s.id
        WHERE 1=1
    ";
    $params = [];

    if ($id_emploi) {
        $sql .= " AND cr.id_emploi_temps = :id_emploi";
        $params[':id_emploi'] = $id_emploi;
    }

    $sql .= " ORDER BY FIELD(cr.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), cr.heure_debut";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $creneaux = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => $creneaux,
        'total'   => count($creneaux)
    ]);
}

// ============================================================
//  CREER un créneau
// ============================================================
function creerCreneau($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    $requis = ['id_emploi_temps', 'id_matiere', 'id_enseignant', 'id_salle', 'jour', 'heure_debut', 'heure_fin'];
    foreach ($requis as $champ) {
        if (empty($data[$champ])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Champ requis : $champ"]);
            return;
        }
    }

    try {
        $stmt = $conn->prepare("
            INSERT INTO creneaux 
                (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin)
            VALUES 
                (:id_emploi, :id_matiere, :id_enseignant, :id_salle, :jour, :heure_debut, :heure_fin)
        ");
        $stmt->execute([
            ':id_emploi'     => $data['id_emploi_temps'],
            ':id_matiere'    => $data['id_matiere'],
            ':id_enseignant' => $data['id_enseignant'],
            ':id_salle'      => $data['id_salle'],
            ':jour'          => $data['jour'],
            ':heure_debut'   => $data['heure_debut'],
            ':heure_fin'     => $data['heure_fin']
        ]);

        $id_creneau = $conn->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Créneau créé avec succès',
            'id'      => $id_creneau
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la création']);
    }
}

// ============================================================
//  GENERER le QR-Code d'un créneau
// ============================================================
function genererQR($conn, $id) {
    $stmt = $conn->prepare("
        SELECT cr.*, m.libelle AS matiere, e.nom AS enseignant_nom, 
               e.prenom AS enseignant_prenom, s.libelle AS salle,
               et.semaine_debut
        FROM creneaux cr
        JOIN matieres m    ON cr.id_matiere    = m.id
        JOIN enseignants e ON cr.id_enseignant = e.id
        JOIN salles s      ON cr.id_salle      = s.id
        JOIN emploi_temps et ON cr.id_emploi_temps = et.id
        WHERE cr.id = :id
    ");
    $stmt->execute([':id' => $id]);
    $creneau = $stmt->fetch();

    if (!$creneau) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Créneau non trouvé']);
        return;
    }

    // Générer token unique
    $token = hash_hmac('sha256', $id . $creneau['jour'] . $creneau['heure_debut'], JWT_SECRET);

    // Sauvegarder le token en base
    $stmt = $conn->prepare("
        UPDATE creneaux SET qr_token = :token WHERE id = :id
    ");
    $stmt->execute([':token' => $token, ':id' => $id]);

    // Données encodées dans le QR
    $qr_data = json_encode([
        'token'      => $token,
        'id_creneau' => (int)$id,
        'matiere'    => $creneau['matiere'],
        'salle'      => $creneau['salle'],
        'jour'       => $creneau['jour'],
        'heure'      => $creneau['heure_debut']
    ]);

    // Générer QR-Code SVG
    $options = new QROptions([
        'outputType' => 'svg',
        'eccLevel'   => 'H',
    ]);

    $qrcode = (new QRCode($options))->render($qr_data);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'token'   => $token,
        'qr_svg'  => $qrcode,
        'creneau' => [
            'matiere'     => $creneau['matiere'],
            'enseignant'  => $creneau['enseignant_prenom'] . ' ' . $creneau['enseignant_nom'],
            'salle'       => $creneau['salle'],
            'jour'        => $creneau['jour'],
            'heure_debut' => $creneau['heure_debut'],
            'heure_fin'   => $creneau['heure_fin']
        ]
    ]);
}

// ============================================================
//  SUPPRIMER un créneau
// ============================================================
function supprimerCreneau($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM creneaux WHERE id = :id");
    $stmt->execute([':id' => $id]);

    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Créneau supprimé avec succès']);
}