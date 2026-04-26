<?php
// ============================================================
//  EduSchedule Pro — API Classes
//  Auteur : Bechir
//  Endpoints : GET    /api/classes
//              POST   /api/classes
//              PUT    /api/classes/{id}
//              DELETE /api/classes/{id}
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
        listerClasses($conn);
        break;
    case 'POST':
        Auth::proteger(['admin']);
        creerClasse($conn);
        break;
    case 'PUT':
        Auth::proteger(['admin']);
        modifierClasse($conn, $id);
        break;
    case 'DELETE':
        Auth::proteger(['admin']);
        supprimerClasse($conn, $id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
}

// ============================================================
//  LISTER toutes les classes
// ============================================================
function listerClasses($conn) {
    $annee = $_GET['annee'] ?? null;

    $sql = "SELECT * FROM classes";
    $params = [];

    if ($annee) {
        $sql .= " WHERE annee_academique = :annee";
        $params[':annee'] = $annee;
    }

    $sql .= " ORDER BY niveau, code";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $classes = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => $classes,
        'total'   => count($classes)
    ]);
}

// ============================================================
//  CREER une classe
// ============================================================
function creerClasse($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['code']) || empty($data['libelle']) || empty($data['niveau'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Code, libellé et niveau sont requis'
        ]);
        return;
    }

    try {
        $stmt = $conn->prepare("
            INSERT INTO classes (code, libelle, niveau, annee_academique)
            VALUES (:code, :libelle, :niveau, :annee)
        ");
        $stmt->execute([
            ':code'    => strtoupper(trim($data['code'])),
            ':libelle' => trim($data['libelle']),
            ':niveau'  => $data['niveau'],
            ':annee'   => $data['annee_academique'] ?? '2025-2026'
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Classe créée avec succès',
            'id'      => $conn->lastInsertId()
        ]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Ce code de classe existe déjà'
        ]);
    }
}

// ============================================================
//  MODIFIER une classe
// ============================================================
function modifierClasse($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $stmt = $conn->prepare("
        UPDATE classes 
        SET code = :code, libelle = :libelle, niveau = :niveau
        WHERE id = :id
    ");
    $stmt->execute([
        ':code'    => strtoupper(trim($data['code'])),
        ':libelle' => trim($data['libelle']),
        ':niveau'  => $data['niveau'],
        ':id'      => $id
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Classe modifiée avec succès'
    ]);
}

// ============================================================
//  SUPPRIMER une classe
// ============================================================
function supprimerClasse($conn, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID requis']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM classes WHERE id = :id");
    $stmt->execute([':id' => $id]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Classe supprimée avec succès'
    ]);
}