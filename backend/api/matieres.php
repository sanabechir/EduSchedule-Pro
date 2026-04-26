<?php
// ============================================================
//  EduSchedule Pro — API Matières
//  Auteur : Bechir
//  Endpoints : GET    /api/matieres
//              POST   /api/matieres
//              PUT    /api/matieres/{id}
//              DELETE /api/matieres/{id}
// ============================================================

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = new Database();
$conn   = $db->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        listerMatieres($conn);
        break;
    case 'POST':
        Auth::proteger(['admin']);
        creerMatiere($conn);
        break;
    case 'PUT':
        Auth::proteger(['admin']);
        modifierMatiere($conn, $id);
        break;
    case 'DELETE':
        Auth::proteger(['admin']);
        supprimerMatiere($conn, $id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

function listerMatieres($conn) {
    $stmt = $conn->query("SELECT * FROM matieres ORDER BY libelle");
    $matieres = $stmt->fetchAll();
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => $matieres,
        'total'   => count($matieres)
    ]);
}

function creerMatiere($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['code']) || empty($data['libelle'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Code et libellé requis']);
        return;
    }

    try {
        $stmt = $conn->prepare("
            INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient)
            VALUES (:code, :libelle, :volume, :coeff)
        ");
        $stmt->execute([
            ':code'    => strtoupper(trim($data['code'])),
            ':libelle' => trim($data['libelle']),
            ':volume'  => $data['volume_horaire_total'] ?? 0,
            ':coeff'   => $data['coefficient'] ?? 1
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Matière créée avec succès',
            'id'      => $conn->lastInsertId()
        ]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Ce code matière existe déjà']);
    }
}

function modifierMatiere($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $conn->prepare("
        UPDATE matieres 
        SET code = :code, libelle = :libelle, 
            volume_horaire_total = :volume, coefficient = :coeff
        WHERE id = :id
    ");
    $stmt->execute([
        ':code'    => strtoupper(trim($data['code'])),
        ':libelle' => trim($data['libelle']),
        ':volume'  => $data['volume_horaire_total'] ?? 0,
        ':coeff'   => $data['coefficient'] ?? 1,
        ':id'      => $id
    ]);

    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Matière modifiée avec succès']);
}

function supprimerMatiere($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM matieres WHERE id = :id");
    $stmt->execute([':id' => $id]);
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Matière supprimée avec succès']);
}