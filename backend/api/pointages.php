<?php
require_once "../middleware/auth.php";
$user = checkAuth();
require_once(__DIR__ . '/../middleware/auth.php');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once(__DIR__ . "/../config/database.php");

$db = new Database();
$conn = $db->getConnection();

$data = json_decode(file_get_contents("php://input"));

$creneau_id = $data->creneau_id ?? null;

if(!$creneau_id){
    echo json_encode(["success"=>false]);
    exit;
}

$stmt = $conn->prepare("
SELECT h.heure_debut
FROM creneaux c
JOIN horaires h ON c.horaire_id = h.id
WHERE c.id = ?
");

$stmt->execute([$creneau_id]);
$row = $stmt->fetch();

$now = date("H:i:s");

$statut = ($now <= $row['heure_debut']) ? "valide" : "retard";

$stmt = $conn->prepare("
INSERT INTO pointages (creneau_id, date_pointage, statut)
VALUES (?, NOW(), ?)
");

$stmt->execute([$creneau_id, $statut]);

echo json_encode([
    "success"=>true,
    "statut"=>$statut
]);