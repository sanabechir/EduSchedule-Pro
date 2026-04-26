<?php
// ============================================================
//  EduSchedule Pro — API Salles
//  Auteur : Bechir
//  Endpoints : GET    /api/salles
//              POST   /api/salles
//              PUT    /api/salles/{id}
//              DELETE /api/salles/{id}
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
        listerSalles($conn);
        break;
    case 'POST':
        Auth::proteger(['admin']);
        creerSalle($conn);
        break;
    case 'PUT':
        Auth::proteger(['admin']);
        modifierSalle($conn, $id);
        break;
    case 'DELETE':
        Auth::proteger(['admin']);
        supprimerSalle($conn, $id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

function listerSalles($conn) {
    $disponible = $_GET['disponible'] ?? null;

    $sql    = "SELECT * FROM salles";
    $params = [];

    if ($disponible !== null) {
        $sql .= " WHERE disponible = :disponible";
        $params[':disponible'] = $disponible;
    }

    $sql .= " ORDER BY code";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $salles = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => $salles,
        'total'   => count($salles)
    ]);
}

function creerSalle($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['code']) || empty($data['libelle'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Code et libellé requis']);
        return;
    }

    try {
        $stmt = $conn->prepare("
            INSERT INTO salles (code, libelle, capacite, equipements, batiment)
            VALUES (:code, :libelle, :capacite, :equipements, :batiment)
        ");
        $stmt->execute([
            ':code'        => strtoupper(trim($data['code'])),
            ':libelle'     => trim($data['libelle']),
            ':capacite'    => $data['capacite']    ?? 30,
            ':equipements' => $data['equipements'] ?? null,
            ':batiment'    => $data['batiment']    ?? null
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Salle créée avec succès',
            'id'      => $conn->lastInsertId()
        ]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Ce code salle existe déjà']);
    }
}

function modifierSalle($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $conn->prepare("
        UPDATE salles 
        SET code = :code, libelle = :libelle, capacite = :capacite,
            equipements = :equipements, batiment = :batiment
        WHERE id = :id
    ");
    $stmt->execute([
        ':code'        => strtoupper(trim($data['code'])),
        ':libelle'     => trim($data['libelle']),
        ':capacite'    => $data['capacite']    ?? 30,
        ':equipements' => $data['equipements'] ?? null,
        ':batiment'    => $data['batiment']    ?? null,
        ':id'          => $id
    ]);

    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Salle modifiée avec succès']);
}

function supprimerSalle($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $stmt = $conn->prepare("UPDATE salles SET disponible = 0 WHERE id = :id");
    $stmt->execute([':id' => $id]);
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Salle désactivée avec succès']);
}