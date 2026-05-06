<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

function json_response($success, $message, $data = null, $status = 200) {
    http_response_code($status);
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function db() {
    try {
        return new PDO(
            "mysql:host=127.0.0.1;port=3308;dbname=eduschedulepro;charset=utf8mb4",
            "root",
            "",
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
    } catch (PDOException $e) {
        json_response(false, "Erreur connexion BDD : " . $e->getMessage(), null, 500);
    }
}

function body() {
    $raw = file_get_contents("php://input");
    $json = json_decode($raw, true);
    return is_array($json) ? $json : $_POST;
}

function get_id($pdo, $table, $field, $value) {
    $allowed = ["classes", "matieres", "enseignants", "salles", "horaires"];

    if (!in_array($table, $allowed, true)) {
        return null;
    }

    $sql = "SELECT id FROM $table WHERE $field = :value LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([":value" => $value]);
    $row = $stmt->fetch();

    return $row ? (int) $row["id"] : null;
}

function get_teacher_id($pdo, $value) {
    $stmt = $pdo->prepare("
        SELECT id
        FROM enseignants
        WHERE email = :value
           OR CONCAT(nom, ' ', prenom) = :value
           OR CONCAT(prenom, ' ', nom) = :value
        LIMIT 1
    ");

    $stmt->execute([":value" => $value]);
    $row = $stmt->fetch();

    return $row ? (int) $row["id"] : null;
}

function get_or_create_matiere($pdo, $nom, $classe_id) {
    $stmt = $pdo->prepare("SELECT id FROM matieres WHERE nom = :nom AND classe_id = :classe_id LIMIT 1");
    $stmt->execute([
        ":nom" => $nom,
        ":classe_id" => $classe_id
    ]);

    $row = $stmt->fetch();

    if ($row) {
        return (int) $row["id"];
    }

    $stmt = $pdo->prepare("INSERT INTO matieres (nom, classe_id) VALUES (:nom, :classe_id)");
    $stmt->execute([
        ":nom" => $nom,
        ":classe_id" => $classe_id
    ]);

    return (int) $pdo->lastInsertId();
}

function get_or_create_salle($pdo, $nom) {
    $id = get_id($pdo, "salles", "nom", $nom);

    if ($id) {
        return $id;
    }

    $stmt = $pdo->prepare("INSERT INTO salles (nom, capacite) VALUES (:nom, 40)");
    $stmt->execute([":nom" => $nom]);

    return (int) $pdo->lastInsertId();
}

function get_or_create_horaire($pdo, $label) {
    $id = get_id($pdo, "horaires", "label", $label);

    if ($id) {
        return $id;
    }

    $stmt = $pdo->prepare("INSERT INTO horaires (label) VALUES (:label)");
    $stmt->execute([":label" => $label]);

    return (int) $pdo->lastInsertId();
}

function list_schedule($pdo) {
    $seances = $pdo->query("
        SELECT
            c.id,
            cl.id AS classe_id,
            cl.nom AS classe,
            m.id AS matiere_id,
            m.nom AS matiere,
            e.id AS enseignant_id,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.id AS salle_id,
            s.nom AS salle,
            h.id AS horaire_id,
            h.label AS horaire,
            c.jour,
            c.type,
            c.groupe
        FROM creneaux c
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        ORDER BY
            cl.nom,
            FIELD(c.jour, 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
            h.label
    ")->fetchAll();

    $classes = $pdo->query("
        SELECT id, nom
        FROM classes
        ORDER BY nom
    ")->fetchAll();

    $enseignants = $pdo->query("
        SELECT
            id,
            nom,
            prenom,
            email,
            CONCAT(nom, ' ', prenom) AS nom_complet
        FROM enseignants
        ORDER BY nom, prenom
    ")->fetchAll();

    $matieres = $pdo->query("
        SELECT
            m.id,
            m.nom,
            m.classe_id,
            cl.nom AS classe
        FROM matieres m
        JOIN classes cl ON cl.id = m.classe_id
        ORDER BY cl.nom, m.nom
    ")->fetchAll();

    $salles = $pdo->query("
        SELECT id, nom, capacite
        FROM salles
        ORDER BY nom
    ")->fetchAll();

    $horaires = $pdo->query("
        SELECT id, label
        FROM horaires
        ORDER BY label
    ")->fetchAll();

    json_response(true, "OK", [
        "seances" => $seances,
        "classes" => $classes,
        "enseignants" => $enseignants,
        "matieres" => $matieres,
        "salles" => $salles,
        "horaires" => $horaires
    ]);
}

function create_schedule($pdo) {
    $data = body();

    $classe = trim($data["classe"] ?? "");
    $matiere = trim($data["matiere"] ?? "");
    $enseignant = trim($data["enseignant"] ?? "");
    $jour = trim($data["jour"] ?? "");
    $horaire = trim($data["horaire"] ?? "");
    $salle = trim($data["salle"] ?? "");
    $type = trim($data["type"] ?? "cours");
    $groupe = trim($data["groupe"] ?? "");

    if ($classe === "" || $matiere === "" || $enseignant === "" || $jour === "" || $horaire === "" || $salle === "") {
        json_response(false, "Tous les champs sont obligatoires.", null, 400);
    }

    if (!in_array($jour, ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"], true)) {
        json_response(false, "Jour invalide.", null, 400);
    }

    if (!in_array($type, ["cours", "td", "tp"], true)) {
        $type = "cours";
    }

    $classe_id = get_id($pdo, "classes", "nom", $classe);

    if (!$classe_id) {
        json_response(false, "Classe introuvable : $classe", null, 404);
    }

    $enseignant_id = get_teacher_id($pdo, $enseignant);

    if (!$enseignant_id) {
        json_response(false, "Enseignant introuvable : $enseignant", null, 404);
    }

    $matiere_id = get_or_create_matiere($pdo, $matiere, $classe_id);
    $salle_id = get_or_create_salle($pdo, $salle);
    $horaire_id = get_or_create_horaire($pdo, $horaire);

    $conflict = $pdo->prepare("
        SELECT
            c.id,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            s.nom AS salle,
            c.jour,
            h.label AS horaire
        FROM creneaux c
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        WHERE c.jour = :jour
          AND c.horaire_id = :horaire_id
          AND (
                c.classe_id = :classe_id
             OR c.enseignant_id = :enseignant_id
             OR c.salle_id = :salle_id
          )
        LIMIT 1
    ");

    $conflict->execute([
        ":jour" => $jour,
        ":horaire_id" => $horaire_id,
        ":classe_id" => $classe_id,
        ":enseignant_id" => $enseignant_id,
        ":salle_id" => $salle_id
    ]);

    $row = $conflict->fetch();

    if ($row) {
        json_response(false, "Conflit détecté sur ce créneau.", [
            "conflict" => $row
        ], 409);
    }

    $stmt = $pdo->prepare("
        INSERT INTO creneaux
            (classe_id, matiere_id, enseignant_id, salle_id, jour, horaire_id, type, groupe)
        VALUES
            (:classe_id, :matiere_id, :enseignant_id, :salle_id, :jour, :horaire_id, :type, :groupe)
    ");

    $stmt->execute([
        ":classe_id" => $classe_id,
        ":matiere_id" => $matiere_id,
        ":enseignant_id" => $enseignant_id,
        ":salle_id" => $salle_id,
        ":jour" => $jour,
        ":horaire_id" => $horaire_id,
        ":type" => $type,
        ":groupe" => $groupe !== "" ? $groupe : null
    ]);

    json_response(true, "Séance créée avec succès.", [
        "id" => (int) $pdo->lastInsertId()
    ]);
}

function delete_schedule($pdo) {
    $data = body();
    $id = (int)($data["id"] ?? $_GET["id"] ?? 0);

    if ($id <= 0) {
        json_response(false, "ID invalide.", null, 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM creneaux WHERE id = :id");
        $stmt->execute([":id" => $id]);

        if ($stmt->rowCount() === 0) {
            json_response(false, "Créneau introuvable.", null, 404);
        }

        json_response(true, "Créneau supprimé.");
    } catch (PDOException $e) {
        json_response(false, "Suppression impossible : ce créneau est peut-être lié à un pointage, un cahier ou une vacation.", [
            "error" => $e->getMessage()
        ], 409);
    }
}

$pdo = db();
$action = $_GET["action"] ?? "list";

try {
    if ($action === "list") {
        list_schedule($pdo);
    }

    if ($action === "create") {
        create_schedule($pdo);
    }

    if ($action === "delete") {
        delete_schedule($pdo);
    }

    json_response(false, "Action inconnue.", null, 404);
} catch (Throwable $e) {
    json_response(false, "Erreur serveur : " . $e->getMessage(), null, 500);
}