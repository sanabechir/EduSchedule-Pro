<?php
require_once "../middleware/auth.php";
$user = checkAuth();
require_once(__DIR__ . '/../middleware/auth.php');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once(__DIR__ . "/../config/database.php");

$db = new Database();
$conn = $db->getConnection();

if($_SERVER['REQUEST_METHOD'] === 'GET'){

    $stmt = $conn->prepare("
    SELECT c.id, c.contenu, c.statut, cr.jour
    FROM cahiers_texte c
    JOIN creneaux cr ON c.creneau_id = cr.id
    ");

    $stmt->execute();

    echo json_encode([
        "success"=>true,
        "data"=>$stmt->fetchAll()
    ]);
}

/* CREATE */
if($_SERVER['REQUEST_METHOD'] === 'POST'){

    $data = json_decode(file_get_contents("php://input"));

    $stmt = $conn->prepare("
    INSERT INTO cahiers_texte (creneau_id, contenu)
    VALUES (?,?)
    ");

    $stmt->execute([
        $data->creneau_id,
        $data->contenu
    ]);

    echo json_encode(["success"=>true]);
}