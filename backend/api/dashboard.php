<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

$user = checkAuth();
$db = (new Database())->getConnection();

try {

    function safeCount($db, $table) {
        try {
            return (int)$db->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }

    $stats = [
        "classes" => safeCount($db, "classes"),
        "enseignants" => safeCount($db, "enseignants"),
        "matieres" => safeCount($db, "matieres"),
        "salles" => safeCount($db, "salles"),
        "creneaux" => safeCount($db, "creneaux"),
        "pointages" => safeCount($db, "pointages")
    ];

    // activité récente sécurisée
    try {
        $recent = $db->query("
            SELECT p.id, p.date_pointage, e.nom, e.prenom
            FROM pointages p
            LEFT JOIN enseignants e ON p.enseignant_id = e.id
            ORDER BY p.date_pointage DESC
            LIMIT 5
        ")->fetchAll();
    } catch (Exception $e) {
        $recent = [];
    }

    jsonResponse([
        "stats" => $stats,
        "recent_activities" => $recent,
        "user" => $user
    ]);

} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}