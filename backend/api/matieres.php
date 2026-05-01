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
    // GET → liste matières
    // ===============================
    if ($method === "GET") {

        $stmt = $db->query("
            SELECT m.*, c.nom AS classe
            FROM matieres m
            LEFT JOIN classes c ON m.classe_id = c.id
            ORDER BY m.id DESC
        ");

        $data = $stmt->fetchAll();

        jsonResponse($data);
    }

    // ===============================
    // POST → ajouter matière
    // ===============================
    if ($method === "POST") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["nom"]) || !isset($data["classe_id"])) {
            errorResponse("Nom et classe requis", 400);
        }

        $stmt = $db->prepare("
            INSERT INTO matieres (nom, classe_id)
            VALUES (?, ?)
        ");

        $stmt->execute([
            $data["nom"],
            $data["classe_id"]
        ]);

        jsonResponse(["id" => $db->lastInsertId()], "Matière ajoutée");
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

        $stmt = $db->prepare("
            UPDATE matieres
            SET nom = ?, classe_id = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $data["nom"],
            $data["classe_id"],
            $data["id"]
        ]);

        jsonResponse([], "Matière modifiée");
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

        $stmt = $db->prepare("DELETE FROM matieres WHERE id = ?");
        $stmt->execute([$data["id"]]);

        jsonResponse([], "Matière supprimée");
    }

} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}