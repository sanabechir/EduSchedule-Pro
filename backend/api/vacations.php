<?php
require_once "../middleware/auth.php";
$user = checkAuth();
require_once(__DIR__ . '/../middleware/auth.php');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once(__DIR__ . "/../config/database.php");

$db = new Database();
$conn = $db->getConnection();

$stmt = $conn->prepare("
SELECT 
v.id,
e.nom,
e.prenom,
v.mois,
v.montant,
v.statut
FROM vacations v
JOIN enseignants e ON v.enseignant_id = e.id
");

$stmt->execute();

echo json_encode([
    "success"=>true,
    "data"=>$stmt->fetchAll()
]);