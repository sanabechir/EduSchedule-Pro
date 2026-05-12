<?php
// backend/api/schedule.php

date_default_timezone_set("Africa/Ouagadougou");

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

function json_response($success, $message, $data = null, $status = 200) {
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");

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

    if (is_array($json)) {
        return $json;
    }

    return $_POST;
}

function normalize_text($value) {
    return trim((string)$value);
}

function normalize_horaire_label($value) {
    $value = trim((string)$value);

    if ($value === "") {
        return "";
    }

    $value = str_replace(["[", "]"], "", $value);
    $value = str_replace(["H", " "], ["h", ""], $value);
    $value = str_replace(["à", "–", "—", ":"], "-", $value);

    if (preg_match('/^(\d{1,2})h?(\d{2})?-(\d{1,2})h?(\d{2})?$/i', $value, $m)) {
        $sh = str_pad($m[1], 2, "0", STR_PAD_LEFT);
        $sm = isset($m[2]) && $m[2] !== "" ? str_pad($m[2], 2, "0", STR_PAD_LEFT) : "00";
        $eh = str_pad($m[3], 2, "0", STR_PAD_LEFT);
        $em = isset($m[4]) && $m[4] !== "" ? str_pad($m[4], 2, "0", STR_PAD_LEFT) : "00";

        return "{$sh}h{$sm}-{$eh}h{$em}";
    }

    return $value;
}

function find_or_create_horaire($pdo, $label) {
    $label = normalize_horaire_label($label);

    if ($label === "") {
        throw new Exception("Horaire obligatoire.");
    }

    $stmt = $pdo->prepare("SELECT id, label FROM horaires WHERE label = :label LIMIT 1");
    $stmt->execute([":label" => $label]);
    $row = $stmt->fetch();

    if ($row) {
        return [
            "id" => (int)$row["id"],
            "label" => $row["label"]
        ];
    }

    $insert = $pdo->prepare("INSERT INTO horaires (label) VALUES (:label)");
    $insert->execute([":label" => $label]);

    return [
        "id" => (int)$pdo->lastInsertId(),
        "label" => $label
    ];
}

function find_classe_id($pdo, $classeName) {
    $classeName = normalize_text($classeName);

    if ($classeName === "") {
        throw new Exception("Classe obligatoire.");
    }

    $stmt = $pdo->prepare("SELECT id FROM classes WHERE nom = :nom LIMIT 1");
    $stmt->execute([":nom" => $classeName]);
    $row = $stmt->fetch();

    if (!$row) {
        throw new Exception("Classe introuvable : " . $classeName);
    }

    return (int)$row["id"];
}

function find_salle_id($pdo, $salleName) {
    $salleName = normalize_text($salleName);

    if ($salleName === "") {
        throw new Exception("Salle obligatoire.");
    }

    $stmt = $pdo->prepare("SELECT id FROM salles WHERE nom = :nom LIMIT 1");
    $stmt->execute([":nom" => $salleName]);
    $row = $stmt->fetch();

    if (!$row) {
        throw new Exception("Salle introuvable : " . $salleName);
    }

    return (int)$row["id"];
}

function find_matiere_id($pdo, $matiereName, $classeId) {
    $matiereName = normalize_text($matiereName);

    if ($matiereName === "") {
        throw new Exception("Matière obligatoire.");
    }

    $stmt = $pdo->prepare("
        SELECT id 
        FROM matieres 
        WHERE nom = :nom 
        AND classe_id = :classe_id
        LIMIT 1
    ");
    $stmt->execute([
        ":nom" => $matiereName,
        ":classe_id" => $classeId
    ]);
    $row = $stmt->fetch();

    if ($row) {
        return (int)$row["id"];
    }

    $stmt = $pdo->prepare("
        SELECT id 
        FROM matieres 
        WHERE nom = :nom
        LIMIT 1
    ");
    $stmt->execute([":nom" => $matiereName]);
    $row = $stmt->fetch();

    if ($row) {
        return (int)$row["id"];
    }

    $insert = $pdo->prepare("
        INSERT INTO matieres (nom, classe_id)
        VALUES (:nom, :classe_id)
    ");
    $insert->execute([
        ":nom" => $matiereName,
        ":classe_id" => $classeId
    ]);

    return (int)$pdo->lastInsertId();
}

function find_enseignant_id($pdo, $teacherName) {
    $teacherName = normalize_text($teacherName);

    if ($teacherName === "") {
        throw new Exception("Professeur obligatoire.");
    }

    $stmt = $pdo->prepare("
        SELECT id
        FROM enseignants
        WHERE CONCAT(nom, ' ', prenom) = :nom_complet
        OR CONCAT(prenom, ' ', nom) = :nom_complet
        OR nom = :nom_complet
        OR email = :nom_complet
        LIMIT 1
    ");
    $stmt->execute([":nom_complet" => $teacherName]);
    $row = $stmt->fetch();

    if (!$row) {
        throw new Exception("Professeur introuvable : " . $teacherName);
    }

    return (int)$row["id"];
}

function list_schedule($pdo) {
    $seances = $pdo->query("
        SELECT
            c.id,
            c.classe_id,
            cl.nom AS classe,
            c.matiere_id,
            m.nom AS matiere,
            c.enseignant_id,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            c.salle_id,
            s.nom AS salle,
            c.horaire_id,
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
            h.label,
            m.nom
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
        LEFT JOIN classes cl ON cl.id = m.classe_id
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

    $classe = normalize_text($data["classe"] ?? "");
    $matiere = normalize_text($data["matiere"] ?? "");
    $enseignant = normalize_text($data["enseignant"] ?? "");
    $jour = normalize_text($data["jour"] ?? "");
    $horaire = normalize_text($data["horaire"] ?? "");
    $salle = normalize_text($data["salle"] ?? "");
    $type = normalize_text($data["type"] ?? "cours");
    $groupe = normalize_text($data["groupe"] ?? "");

    if ($classe === "" || $matiere === "" || $enseignant === "" || $jour === "" || $horaire === "" || $salle === "") {
        json_response(false, "Tous les champs sont obligatoires.", null, 400);
    }

    $allowedDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    if (!in_array($jour, $allowedDays, true)) {
        json_response(false, "Jour invalide.", null, 400);
    }

    $allowedTypes = ["cours", "td", "tp"];

    if (!in_array($type, $allowedTypes, true)) {
        $type = "cours";
    }

    try {
        $pdo->beginTransaction();

        $classeId = find_classe_id($pdo, $classe);
        $matiereId = find_matiere_id($pdo, $matiere, $classeId);
        $enseignantId = find_enseignant_id($pdo, $enseignant);
        $salleId = find_salle_id($pdo, $salle);
        $horaireData = find_or_create_horaire($pdo, $horaire);
        $horaireId = $horaireData["id"];

        $check = $pdo->prepare("
            SELECT 
                c.id,
                cl.nom AS classe,
                m.nom AS matiere,
                CONCAT(e.nom, ' ', e.prenom) AS enseignant,
                s.nom AS salle,
                h.label AS horaire,
                c.jour
            FROM creneaux c
            JOIN classes cl ON cl.id = c.classe_id
            JOIN matieres m ON m.id = c.matiere_id
            JOIN enseignants e ON e.id = c.enseignant_id
            JOIN salles s ON s.id = c.salle_id
            JOIN horaires h ON h.id = c.horaire_id
            WHERE c.classe_id = :classe_id
            AND c.jour = :jour
            AND c.horaire_id = :horaire_id
            LIMIT 1
        ");

        $check->execute([
            ":classe_id" => $classeId,
            ":jour" => $jour,
            ":horaire_id" => $horaireId
        ]);

        $existing = $check->fetch();

        if ($existing) {
            $pdo->rollBack();

            json_response(false, "Cette classe a déjà un cours sur ce jour et cet horaire.", [
                "existing" => $existing
            ], 409);
        }

        $insert = $pdo->prepare("
            INSERT INTO creneaux
                (classe_id, matiere_id, enseignant_id, salle_id, jour, horaire_id, type, groupe)
            VALUES
                (:classe_id, :matiere_id, :enseignant_id, :salle_id, :jour, :horaire_id, :type, :groupe)
        ");

        $insert->execute([
            ":classe_id" => $classeId,
            ":matiere_id" => $matiereId,
            ":enseignant_id" => $enseignantId,
            ":salle_id" => $salleId,
            ":jour" => $jour,
            ":horaire_id" => $horaireId,
            ":type" => $type,
            ":groupe" => $groupe !== "" ? $groupe : null
        ]);

        $newId = (int)$pdo->lastInsertId();

        $pdo->commit();

        json_response(true, "Séance créée avec succès.", [
            "id" => $newId,
            "horaire" => $horaireData["label"]
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        json_response(false, "Erreur création séance : " . $e->getMessage(), null, 500);
    }
}

function delete_schedule($pdo) {
    $data = body();
    $id = (int)($data["id"] ?? 0);

    if ($id <= 0) {
        json_response(false, "ID invalide.", null, 400);
    }

    $stmt = $pdo->prepare("DELETE FROM creneaux WHERE id = :id");
    $stmt->execute([":id" => $id]);

    json_response(true, "Séance supprimée.", [
        "id" => $id
    ]);
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