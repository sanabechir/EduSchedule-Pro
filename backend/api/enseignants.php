<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

$db = (new Database())->getConnection();
$user = checkAuth(); // sécurisé

$method = $_SERVER['REQUEST_METHOD'];

try {

    // ==========================================
    // GET → liste enseignants
    // ==========================================
    if ($method === "GET") {

        $stmt = $db->query("SELECT * FROM enseignants ORDER BY id DESC");
        $data = $stmt->fetchAll();

        jsonResponse($data);
    }

    // ==========================================
    // POST → ajouter enseignant
    // ==========================================
    if ($method === "POST") {

        checkAuth("admin"); // seul admin

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["nom"]) || !isset($data["prenom"])) {
            errorResponse("Nom et prénom requis", 400);
        }

        $stmt = $db->prepare("
            INSERT INTO enseignants (nom, prenom, email)
            VALUES (?, ?, ?)
        ");

        $stmt->execute([
            $data["nom"],
            $data["prenom"],
            $data["email"] ?? null
        ]);

        jsonResponse(["id" => $db->lastInsertId()], "Enseignant ajouté");
    }

    // ==========================================
    // PUT → modifier
    // ==========================================
    if ($method === "PUT") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["id"])) {
            errorResponse("ID requis", 400);
        }

        $stmt = $db->prepare("
            UPDATE enseignants
            SET nom = ?, prenom = ?, email = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $data["nom"],
            $data["prenom"],
            $data["email"] ?? null,
            $data["id"]
        ]);

        jsonResponse([], "Enseignant modifié");
    }

    // ==========================================
    // DELETE → supprimer
    // ==========================================
    if ($method === "DELETE") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["id"])) {
            errorResponse("ID requis", 400);
        }

        $stmt = $db->prepare("DELETE FROM enseignants WHERE id = ?");
        $stmt->execute([$data["id"]]);

        jsonResponse([], "Enseignant supprimé");
    }

} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}