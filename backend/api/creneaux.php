<?php
header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

$db = (new Database())->getConnection();
$user = checkAuth();

$method = $_SERVER['REQUEST_METHOD'];

// 🔥 Fonction vérification existence
function exists($db, $table, $id) {
    $stmt = $db->prepare("SELECT id FROM $table WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

try {

    // ==========================================
    // GET → LISTE PROPRE
    // ==========================================
    if ($method === "GET") {

        $stmt = $db->query("
            SELECT 
                c.id,
                cl.nom AS classe,
                m.nom AS matiere,
                CONCAT(e.nom, ' ', e.prenom) AS enseignant,
                s.nom AS salle,
                c.jour,
                h.label AS horaire,
                c.type,
                c.groupe
            FROM creneaux c
            LEFT JOIN classes cl ON c.classe_id = cl.id
            LEFT JOIN matieres m ON c.matiere_id = m.id
            LEFT JOIN enseignants e ON c.enseignant_id = e.id
            LEFT JOIN salles s ON c.salle_id = s.id
            LEFT JOIN horaires h ON c.horaire_id = h.id
            ORDER BY 
                FIELD(c.jour, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'),
                h.id
        ");

        jsonResponse($stmt->fetchAll());
    }

    // ==========================================
    // POST → VERSION PRO
    // ==========================================
    if ($method === "POST") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        $required = ["classe_id","matiere_id","enseignant_id","salle_id","jour","horaire_id"];

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                errorResponse("Champ manquant: $field", 400);
            }
        }

        // 🔥 normalisation jour
        $data["jour"] = ucfirst(strtolower(trim($data["jour"])));

        // 🔥 vérification existence
        if (!exists($db, "classes", $data["classe_id"])) errorResponse("Classe invalide");
        if (!exists($db, "matieres", $data["matiere_id"])) errorResponse("Matière invalide");
        if (!exists($db, "enseignants", $data["enseignant_id"])) errorResponse("Enseignant invalide");
        if (!exists($db, "salles", $data["salle_id"])) errorResponse("Salle invalide");

        // 🔥 conflit salle
        $checkSalle = $db->prepare("
            SELECT id FROM creneaux 
            WHERE salle_id = ? AND jour = ? AND horaire_id = ?
        ");
        $checkSalle->execute([$data["salle_id"], $data["jour"], $data["horaire_id"]]);

        if ($checkSalle->fetch()) {
            errorResponse("Salle déjà occupée", 400);
        }

        // 🔥 conflit enseignant
        $checkProf = $db->prepare("
            SELECT id FROM creneaux 
            WHERE enseignant_id = ? AND jour = ? AND horaire_id = ?
        ");
        $checkProf->execute([$data["enseignant_id"], $data["jour"], $data["horaire_id"]]);

        if ($checkProf->fetch()) {
            errorResponse("Enseignant déjà occupé", 400);
        }

        // 🔥 insertion
        $stmt = $db->prepare("
            INSERT INTO creneaux 
            (classe_id, matiere_id, enseignant_id, salle_id, jour, horaire_id, type, groupe)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $data["classe_id"],
            $data["matiere_id"],
            $data["enseignant_id"],
            $data["salle_id"],
            $data["jour"],
            $data["horaire_id"],
            $data["type"] ?? "cours",
            $data["groupe"] ?? null
        ]);

        jsonResponse(["id"=>$db->lastInsertId()], "Créneau ajouté");
    }

    // ==========================================
    // DELETE
    // ==========================================
    if ($method === "DELETE") {

        checkAuth("admin");

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data["id"])) errorResponse("ID requis");

        $stmt = $db->prepare("DELETE FROM creneaux WHERE id = ?");
        $stmt->execute([$data["id"]]);

        jsonResponse([], "Créneau supprimé");
    }

} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}