<?php
// backend/api/cahiers_texte.php

date_default_timezone_set("Africa/Ouagadougou");

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

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

function ensure_table($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cahiers_texte (
            id INT AUTO_INCREMENT PRIMARY KEY,
            creneau_id INT NOT NULL,
            titre VARCHAR(255) NOT NULL DEFAULT '',
            contenu TEXT NULL,
            travaux TEXT NULL,
            observation TEXT NULL,
            statut VARCHAR(50) NOT NULL DEFAULT 'brouillon',
            signature_delegue TINYINT(1) NOT NULL DEFAULT 0,
            signature_enseignant TINYINT(1) NOT NULL DEFAULT 0,
            signature_delegue_image LONGTEXT NULL,
            signature_enseignant_image LONGTEXT NULL,
            locked TINYINT(1) NOT NULL DEFAULT 0,
            created_by VARCHAR(150) NULL,
            updated_by VARCHAR(150) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY unique_cahier_creneau (creneau_id),
            INDEX (creneau_id),
            INDEX (statut),
            INDEX (locked)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function get_cahiers($pdo) {
    ensure_table($pdo);

    $week = trim((string)($_GET["week"] ?? ""));

    $where = "";
    $params = [];

    if ($week !== "") {
        $where = "WHERE (c.week_key = :week OR c.week_key IS NULL OR c.week_key = '')";
        $params[":week"] = $week;
    }

    $sql = "
        SELECT
            ct.id,
            ct.creneau_id,
            ct.creneau_id AS seanceId,
            ct.creneau_id AS seance_id,
            ct.titre,
            ct.contenu,
            ct.travaux,
            ct.observation,
            ct.statut,
            ct.signature_delegue,
            ct.signature_enseignant,
            ct.signature_delegue_image,
            ct.signature_enseignant_image,
            ct.locked,
            ct.created_by,
            ct.updated_by,
            ct.created_at,
            ct.updated_at,

            c.week_key,
            c.jour,
            c.type,
            c.groupe,

            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            h.label AS horaire
        FROM cahiers_texte ct
        JOIN creneaux c ON c.id = ct.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        {$where}
        ORDER BY
            FIELD(c.jour, 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
            h.label,
            cl.nom,
            m.nom
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $rows = $stmt->fetchAll();

    $cahiers = array_map(function ($row) {
        return normalize_cahier_row($row);
    }, $rows);

    json_response(true, "Cahiers chargés.", [
        "cahiers" => $cahiers,
        "updated_at" => date("Y-m-d H:i:s")
    ]);
}

function get_one_cahier($pdo) {
    ensure_table($pdo);

    $creneauId = (int)($_GET["creneau_id"] ?? $_GET["seance_id"] ?? 0);

    if ($creneauId <= 0) {
        json_response(false, "Créneau obligatoire.", null, 400);
    }

    $stmt = $pdo->prepare("
        SELECT
            ct.id,
            ct.creneau_id,
            ct.creneau_id AS seanceId,
            ct.creneau_id AS seance_id,
            ct.titre,
            ct.contenu,
            ct.travaux,
            ct.observation,
            ct.statut,
            ct.signature_delegue,
            ct.signature_enseignant,
            ct.signature_delegue_image,
            ct.signature_enseignant_image,
            ct.locked,
            ct.created_by,
            ct.updated_by,
            ct.created_at,
            ct.updated_at,

            c.week_key,
            c.jour,
            c.type,
            c.groupe,

            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            h.label AS horaire
        FROM cahiers_texte ct
        JOIN creneaux c ON c.id = ct.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        WHERE ct.creneau_id = :creneau_id
        LIMIT 1
    ");

    $stmt->execute([
        ":creneau_id" => $creneauId
    ]);

    $row = $stmt->fetch();

    json_response(true, "Cahier chargé.", [
        "cahier" => $row ? normalize_cahier_row($row) : null
    ]);
}

function save_cahier($pdo) {
    ensure_table($pdo);

    $data = body();

    $creneauId = (int)($data["creneau_id"] ?? $data["seanceId"] ?? $data["seance_id"] ?? 0);
    $titre = trim((string)($data["titre"] ?? ""));
    $contenu = trim((string)($data["contenu"] ?? ""));
    $travaux = trim((string)($data["travaux"] ?? ""));
    $observation = trim((string)($data["observation"] ?? ""));
    $updatedBy = trim((string)($data["updated_by"] ?? $data["created_by"] ?? ""));

    if ($creneauId <= 0) {
        json_response(false, "Créneau obligatoire.", null, 400);
    }

    if ($titre === "" || $contenu === "") {
        json_response(false, "Le titre et le contenu sont obligatoires.", null, 400);
    }

    $existing = find_cahier_by_creneau($pdo, $creneauId);

    if ($existing && (int)$existing["locked"] === 1) {
        json_response(false, "Ce cahier est clôturé. Modification impossible.", null, 403);
    }

    $now = date("Y-m-d H:i:s");

    $stmt = $pdo->prepare("
        INSERT INTO cahiers_texte
            (
                creneau_id,
                titre,
                contenu,
                travaux,
                observation,
                statut,
                created_by,
                updated_by,
                updated_at
            )
        VALUES
            (
                :creneau_id,
                :titre,
                :contenu,
                :travaux,
                :observation,
                'brouillon',
                :created_by,
                :updated_by,
                :updated_at
            )
        ON DUPLICATE KEY UPDATE
            titre = VALUES(titre),
            contenu = VALUES(contenu),
            travaux = VALUES(travaux),
            observation = VALUES(observation),
            updated_by = VALUES(updated_by),
            updated_at = VALUES(updated_at)
    ");

    $stmt->execute([
        ":creneau_id" => $creneauId,
        ":titre" => $titre,
        ":contenu" => $contenu,
        ":travaux" => $travaux,
        ":observation" => $observation,
        ":created_by" => $updatedBy !== "" ? $updatedBy : null,
        ":updated_by" => $updatedBy !== "" ? $updatedBy : null,
        ":updated_at" => $now
    ]);

    $cahier = get_cahier_full($pdo, $creneauId);

    json_response(true, "Cahier enregistré.", [
        "cahier" => $cahier
    ]);
}

function sign_delegue($pdo) {
    ensure_table($pdo);

    $data = body();

    $creneauId = (int)($data["creneau_id"] ?? $data["seanceId"] ?? $data["seance_id"] ?? 0);
    $signature = (string)($data["signature"] ?? $data["signatureDelegueImage"] ?? "");
    $updatedBy = trim((string)($data["updated_by"] ?? ""));

    if ($creneauId <= 0) {
        json_response(false, "Créneau obligatoire.", null, 400);
    }

    if ($signature === "") {
        json_response(false, "Signature obligatoire.", null, 400);
    }

    $existing = find_cahier_by_creneau($pdo, $creneauId);

    if (!$existing) {
        json_response(false, "Le cahier doit être renseigné avant signature.", null, 404);
    }

    if ((int)$existing["locked"] === 1) {
        json_response(false, "Ce cahier est déjà clôturé.", null, 403);
    }

    if ((int)$existing["signature_delegue"] === 1) {
        json_response(false, "Le délégué a déjà signé ce cahier.", null, 409);
    }

    $stmt = $pdo->prepare("
        UPDATE cahiers_texte
        SET
            signature_delegue = 1,
            signature_delegue_image = :signature,
            statut = 'signe_delegue',
            updated_by = :updated_by,
            updated_at = :updated_at
        WHERE creneau_id = :creneau_id
    ");

    $stmt->execute([
        ":signature" => $signature,
        ":updated_by" => $updatedBy !== "" ? $updatedBy : null,
        ":updated_at" => date("Y-m-d H:i:s"),
        ":creneau_id" => $creneauId
    ]);

    $cahier = get_cahier_full($pdo, $creneauId);

    json_response(true, "Signature du délégué enregistrée.", [
        "cahier" => $cahier
    ]);
}

function sign_enseignant($pdo) {
    ensure_table($pdo);

    $data = body();

    $creneauId = (int)($data["creneau_id"] ?? $data["seanceId"] ?? $data["seance_id"] ?? 0);
    $signature = (string)($data["signature"] ?? $data["signatureEnseignantImage"] ?? "");
    $updatedBy = trim((string)($data["updated_by"] ?? ""));

    if ($creneauId <= 0) {
        json_response(false, "Créneau obligatoire.", null, 400);
    }

    if ($signature === "") {
        json_response(false, "Signature obligatoire.", null, 400);
    }

    $existing = find_cahier_by_creneau($pdo, $creneauId);

    if (!$existing) {
        json_response(false, "Le cahier doit être renseigné avant signature.", null, 404);
    }

    if ((int)$existing["locked"] === 1) {
        json_response(false, "Ce cahier est déjà clôturé.", null, 403);
    }

    if ((int)$existing["signature_delegue"] !== 1) {
        json_response(false, "Le délégué doit signer avant l’enseignant.", null, 403);
    }

    if ((int)$existing["signature_enseignant"] === 1) {
        json_response(false, "L’enseignant a déjà signé ce cahier.", null, 409);
    }

    $stmt = $pdo->prepare("
        UPDATE cahiers_texte
        SET
            signature_enseignant = 1,
            signature_enseignant_image = :signature,
            statut = 'signe_enseignant',
            locked = 1,
            updated_by = :updated_by,
            updated_at = :updated_at
        WHERE creneau_id = :creneau_id
    ");

    $stmt->execute([
        ":signature" => $signature,
        ":updated_by" => $updatedBy !== "" ? $updatedBy : null,
        ":updated_at" => date("Y-m-d H:i:s"),
        ":creneau_id" => $creneauId
    ]);

    $cahier = get_cahier_full($pdo, $creneauId);

    json_response(true, "Signature enseignant enregistrée. Cahier clôturé.", [
        "cahier" => $cahier
    ]);
}

function find_cahier_by_creneau($pdo, $creneauId) {
    $stmt = $pdo->prepare("
        SELECT *
        FROM cahiers_texte
        WHERE creneau_id = :creneau_id
        LIMIT 1
    ");

    $stmt->execute([
        ":creneau_id" => $creneauId
    ]);

    return $stmt->fetch();
}

function get_cahier_full($pdo, $creneauId) {
    $stmt = $pdo->prepare("
        SELECT
            ct.id,
            ct.creneau_id,
            ct.creneau_id AS seanceId,
            ct.creneau_id AS seance_id,
            ct.titre,
            ct.contenu,
            ct.travaux,
            ct.observation,
            ct.statut,
            ct.signature_delegue,
            ct.signature_enseignant,
            ct.signature_delegue_image,
            ct.signature_enseignant_image,
            ct.locked,
            ct.created_by,
            ct.updated_by,
            ct.created_at,
            ct.updated_at,

            c.week_key,
            c.jour,
            c.type,
            c.groupe,

            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            h.label AS horaire
        FROM cahiers_texte ct
        JOIN creneaux c ON c.id = ct.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        WHERE ct.creneau_id = :creneau_id
        LIMIT 1
    ");

    $stmt->execute([
        ":creneau_id" => $creneauId
    ]);

    $row = $stmt->fetch();

    return $row ? normalize_cahier_row($row) : null;
}

function normalize_cahier_row($row) {
    return [
        "id" => (int)$row["id"],
        "seanceId" => (int)$row["creneau_id"],
        "seance_id" => (int)$row["creneau_id"],
        "creneau_id" => (int)$row["creneau_id"],

        "titre" => $row["titre"] ?? "",
        "contenu" => $row["contenu"] ?? "",
        "travaux" => $row["travaux"] ?? "",
        "observation" => $row["observation"] ?? "",

        "statut" => $row["statut"] ?? "brouillon",
        "signatureDelegue" => ((int)($row["signature_delegue"] ?? 0)) === 1,
        "signatureEnseignant" => ((int)($row["signature_enseignant"] ?? 0)) === 1,
        "signatureDelegueImage" => $row["signature_delegue_image"] ?? "",
        "signatureEnseignantImage" => $row["signature_enseignant_image"] ?? "",
        "locked" => ((int)($row["locked"] ?? 0)) === 1,

        "createdBy" => $row["created_by"] ?? "",
        "updatedBy" => $row["updated_by"] ?? "",
        "createdAt" => $row["created_at"] ?? "",
        "updatedAt" => $row["updated_at"] ?? "",

        "weekKey" => $row["week_key"] ?? "",
        "week_key" => $row["week_key"] ?? "",
        "jour" => $row["jour"] ?? "",
        "type" => $row["type"] ?? "",
        "groupe" => $row["groupe"] ?? "",

        "classe" => $row["classe"] ?? "",
        "matiere" => $row["matiere"] ?? "",
        "enseignant" => $row["enseignant"] ?? "",
        "enseignant_email" => $row["enseignant_email"] ?? "",
        "salle" => $row["salle"] ?? "",
        "horaire" => $row["horaire"] ?? ""
    ];
}

$action = $_GET["action"] ?? "list";

try {
    $pdo = db();

    if ($action === "list") {
        get_cahiers($pdo);
    }

    if ($action === "one") {
        get_one_cahier($pdo);
    }

    if ($action === "save") {
        save_cahier($pdo);
    }

    if ($action === "sign_delegue") {
        sign_delegue($pdo);
    }

    if ($action === "sign_enseignant") {
        sign_enseignant($pdo);
    }

    json_response(false, "Action inconnue.", null, 404);
} catch (Throwable $e) {
    json_response(false, "Erreur serveur : " . $e->getMessage(), null, 500);
}