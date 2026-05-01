<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

$db = (new Database())->getConnection();
$user = checkAuth();

$method = $_SERVER['REQUEST_METHOD'];

try {

    // ===============================
    // GET → liste salles
    // ===============================
    if ($method === "GET") {

        $stmt = $db->query("SELECT * FROM salles ORDER BY id DESC");
        $data = $stmt->fetchAll();

        jsonResponse($data);
    }

    // ===============================
    // POST → ajouter salle
    // ===============================
    if ($method === "POST") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["nom"])) {
            errorResponse("Nom requis", 400);
        }

        $stmt = $db->prepare("INSERT INTO salles (nom) VALUES (?)");
        $stmt->execute([$data["nom"]]);

        jsonResponse(["id" => $db->lastInsertId()], "Salle ajoutée");
    }

    // ===============================
    // PUT → modifier
    // ===============================
    if ($method === "PUT") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["id"])) {
            errorResponse("ID requis", 400);
        }

        $stmt = $db->prepare("UPDATE salles SET nom = ? WHERE id = ?");
        $stmt->execute([$data["nom"], $data["id"]]);

        jsonResponse([], "Salle modifiée");
    }

    // ===============================
    // DELETE → supprimer
    // ===============================
    if ($method === "DELETE") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["id"])) {
            errorResponse("ID requis", 400);
        }

        $stmt = $db->prepare("DELETE FROM salles WHERE id = ?");
        $stmt->execute([$data["id"]]);

        jsonResponse([], "Salle supprimée");
    }

} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}