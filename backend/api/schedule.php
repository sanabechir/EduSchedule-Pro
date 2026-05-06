<?php
// backend/api/schedule.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

function send_json($success, $message, $data = null, $status = 200) {
    http_response_code($status);

    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

function db() {
    $host = "127.0.0.1";
    $port = "3308";
    $dbname = "eduschedulepro";
    $username = "root";
    $password = "";

    try {
        return new PDO(
            "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
    } catch (PDOException $e) {
        send_json(false, "Erreur connexion BDD : " . $e->getMessage(), null, 500);
    }
}

function read_json_body() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (is_array($data)) {
        return $data;
    }

    return $_POST;
}

function list_schedule($pdo) {
    $seancesSql = "
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
    ";

    $seances = $pdo->query($seancesSql)->fetchAll();

    $classes = $pdo
        ->query("SELECT id, nom FROM classes ORDER BY nom")
        ->fetchAll();

    $enseignants = $pdo
        ->query("
            SELECT 
                id,
                nom,
                prenom,
                email,
                CONCAT(nom, ' ', prenom) AS nom_complet
            FROM enseignants
            ORDER BY nom, prenom
        ")
        ->fetchAll();

    $matieres = $pdo
        ->query("
            SELECT 
                m.id,
                m.nom,
                m.classe_id,
                cl.nom AS classe
            FROM matieres m
            JOIN classes cl ON cl.id = m.classe_id
            ORDER BY cl.nom, m.nom
        ")
        ->fetchAll();

    $salles = $pdo
        ->query("SELECT id, nom, capacite FROM salles ORDER BY nom")
        ->fetchAll();

    $horaires = $pdo
        ->query("SELECT id, label FROM horaires ORDER BY label")
        ->fetchAll();

    send_json(true, "OK", [
        "seances" => $seances,
        "classes" => $classes,
        "enseignants" => $enseignants,
        "matieres" => $matieres,
        "salles" => $salles,
        "horaires" => $horaires
    ]);
}

function find_id_by_name($pdo, $table, $name) {
    $allowedTables = ["classes", "salles", "horaires"];

    if (!in_array($table, $allowedTables, true)) {
        return null;
    }

    $column = $table === "horaires" ? "label" : "nom";

    $stmt = $pdo->prepare("SELECT id FROM $table WHERE $column = :name LIMIT 1");
    $stmt->execute([":name" => $name]);

    $row = $stmt->fetch();

    return $row ? (int) $row["id"] : null;
}

function find_teacher_id($pdo, $teacherName) {
    $stmt = $pdo->prepare("
        SELECT id
        FROM enseignants
        WHERE CONCAT(nom, ' ', prenom) = :teacher
           OR CONCAT(prenom, ' ', nom) = :teacher
           OR email = :teacher
        LIMIT 1
    ");

    $stmt->execute([":teacher" => $teacherName]);

    $row = $stmt->fetch();

    return $row ? (int) $row["id"] : null;
}

function find_or_create_subject($pdo, $subjectName, $classId) {
    $stmt = $pdo->prepare("
        SELECT id
        FROM matieres
        WHERE nom = :nom
        LIMIT 1
    ");

    $stmt->execute([":nom" => $subjectName]);

    $row = $stmt->fetch();

    if ($row) {
        return (int) $row["id"];
    }

    $insert = $pdo->prepare("
        INSERT INTO matieres (nom, classe_id)
        VALUES (:nom, :classe_id)
    ");

    $insert->execute([
        ":nom" => $subjectName,
        ":classe_id" => $classId
    ]);

    return (int) $pdo->lastInsertId();
}

function find_or_create_room($pdo, $roomName) {
    $id = find_id_by_name($pdo, "salles", $roomName);

    if ($id) {
        return $id;
    }

    $stmt = $pdo->prepare("
        INSERT INTO salles (nom, capacite)
        VALUES (:nom, 40)
    ");

    $stmt->execute([":nom" => $roomName]);

    return (int) $pdo->lastInsertId();
}

function find_or_create_time($pdo, $timeLabel) {
    $id = find_id_by_name($pdo, "horaires", $timeLabel);

    if ($id) {
        return $id;
    }

    $stmt = $pdo->prepare("
        INSERT INTO horaires (label)
        VALUES (:label)
    ");

    $stmt->execute([":label" => $timeLabel]);

    return (int) $pdo->lastInsertId();
}

function create_schedule($pdo) {
    $data = read_json_body();

    $classe = trim($data["classe"] ?? "");
    $matiere = trim($data["matiere"] ?? "");
    $enseignant = trim($data["enseignant"] ?? "");
    $jour = trim($data["jour"] ?? "");
    $horaire = trim($data["horaire"] ?? "");
    $salle = trim($data["salle"] ?? "");
    $type = trim($data["type"] ?? "cours");
    $groupe = trim($data["groupe"] ?? "");

    if (
        $classe === "" ||
        $matiere === "" ||
        $enseignant === "" ||
        $jour === "" ||
        $horaire === "" ||
        $salle === ""
    ) {
        send_json(false, "Tous les champs sont obligatoires.", null, 400);
    }

    $allowedDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    if (!in_array($jour, $allowedDays, true)) {
        send_json(false, "Jour invalide.", null, 400);
    }

    $allowedTypes = ["cours", "td", "tp"];

    if (!in_array($type, $allowedTypes, true)) {
        $type = "cours";
    }

    $classId = find_id_by_name($pdo, "classes", $classe);

    if (!$classId) {
        send_json(false, "Classe introuvable : " . $classe, null, 404);
    }

    $teacherId = find_teacher_id($pdo, $enseignant);

    if (!$teacherId) {
        send_json(false, "Enseignant introuvable : " . $enseignant, null, 404);
    }

    $subjectId = find_or_create_subject($pdo, $matiere, $classId);
    $roomId = find_or_create_room($pdo, $salle);
    $timeId = find_or_create_time($pdo, $horaire);

    $conflictStmt = $pdo->prepare("
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

    $conflictStmt->execute([
        ":jour" => $jour,
        ":horaire_id" => $timeId,
        ":classe_id" => $classId,
        ":enseignant_id" => $teacherId,
        ":salle_id" => $roomId
    ]);

    $conflict = $conflictStmt->fetch();

    if ($conflict) {
        send_json(false, "Conflit détecté sur ce créneau.", [
            "conflict" => $conflict
        ], 409);
    }

    $insert = $pdo->prepare("
        INSERT INTO creneaux (
            classe_id,
            matiere_id,
            enseignant_id,
            salle_id,
            jour,
            horaire_id,
            type,
            groupe
        )
        VALUES (
            :classe_id,
            :matiere_id,
            :enseignant_id,
            :salle_id,
            :jour,
            :horaire_id,
            :type,
            :groupe
        )
    ");

    $insert->execute([
        ":classe_id" => $classId,
        ":matiere_id" => $subjectId,
        ":enseignant_id" => $teacherId,
        ":salle_id" => $roomId,
        ":jour" => $jour,
        ":horaire_id" => $timeId,
        ":type" => $type,
        ":groupe" => $groupe !== "" ? $groupe : null
    ]);

    send_json(true, "Séance créée avec succès.", [
        "id" => (int) $pdo->lastInsertId()
    ]);
}

function delete_schedule($pdo) {
    $data = read_json_body();

    $id = (int) ($data["id"] ?? $_GET["id"] ?? 0);

    if ($id <= 0) {
        send_json(false, "ID invalide.", null, 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM creneaux WHERE id = :id");
        $stmt->execute([":id" => $id]);

        if ($stmt->rowCount() === 0) {
            send_json(false, "Créneau introuvable.", null, 404);
        }

        send_json(true, "Créneau supprimé.");
    } catch (PDOException $e) {
        send_json(
            false,
            "Impossible de supprimer ce créneau car il est peut-être déjà utilisé par un pointage, un cahier ou une vacation.",
            ["error" => $e->getMessage()],
            409
        );
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

    send_json(false, "Action inconnue.", null, 404);
} catch (Throwable $e) {
    send_json(false, "Erreur serveur : " . $e->getMessage(), null, 500);
}