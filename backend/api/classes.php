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
    // GET → liste classes
    // ===============================
    if ($method === "GET") {

        $stmt = $db->query("SELECT * FROM classes ORDER BY id DESC");
        $data = $stmt->fetchAll();

        jsonResponse($data);
    }

    // ===============================
    // POST → ajouter classe
    // ===============================
    if ($method === "POST") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["nom"])) {
            errorResponse("Nom requis", 400);
        }

        $stmt = $db->prepare("INSERT INTO classes (nom) VALUES (?)");
        $stmt->execute([$data["nom"]]);

        jsonResponse(["id" => $db->lastInsertId()], "Classe ajoutée");
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

        $stmt = $db->prepare("UPDATE classes SET nom = ? WHERE id = ?");
        $stmt->execute([$data["nom"], $data["id"]]);

        jsonResponse([], "Classe modifiée");
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

        $stmt = $db->prepare("DELETE FROM classes WHERE id = ?");
        $stmt->execute([$data["id"]]);

        jsonResponse([], "Classe supprimée");
    }

} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}