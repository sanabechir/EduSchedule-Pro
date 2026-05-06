<?php
// backend/api/teacher_qr.php

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

function html_response($title, $message, $details = "", $status = "success", $httpStatus = 200) {
    http_response_code($httpStatus);
    header("Content-Type: text/html; charset=utf-8");

    $color = $status === "success" ? "#047857" : ($status === "warning" ? "#b45309" : "#991b1b");
    $bg = $status === "success" ? "#ecfdf5" : ($status === "warning" ? "#fffbeb" : "#fef2f2");
    $border = $status === "success" ? "#a7f3d0" : ($status === "warning" ? "#fde68a" : "#fecaca");

    echo "
    <!doctype html>
    <html lang='fr'>
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1'>
        <title>$title</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, #f8fafc, #eef2ff);
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
          }

          .card {
            width: min(92vw, 520px);
            padding: 30px;
            border-radius: 28px;
            background: #ffffff;
            box-shadow: 0 25px 70px rgba(15, 23, 42, 0.12);
            text-align: center;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 88px;
            height: 88px;
            margin-bottom: 20px;
            border-radius: 999px;
            background: $bg;
            border: 2px solid $border;
            color: $color;
            font-size: 32px;
            font-weight: 900;
          }

          h1 {
            margin: 0 0 12px;
            font-size: 28px;
            font-weight: 950;
          }

          p {
            margin: 0;
            color: #475569;
            font-size: 16px;
            line-height: 1.6;
            font-weight: 700;
          }

          .details {
            margin-top: 22px;
            padding: 16px;
            border-radius: 18px;
            background: $bg;
            border: 1px solid $border;
            color: $color;
            font-size: 14px;
            line-height: 1.6;
            font-weight: 800;
            text-align: left;
          }

          .footer {
            margin-top: 22px;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        <main class='card'>
          <div class='badge'>" . ($status === "success" ? "✓" : "!") . "</div>
          <h1>$title</h1>
          <p>$message</p>
          " . ($details ? "<div class='details'>$details</div>" : "") . "
          <div class='footer'>EduSchedule Pro</div>
        </main>
      </body>
    </html>
    ";

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

function list_data($pdo) {
    $creneaux = $pdo->query("
        SELECT
            c.id,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            c.jour,
            h.label AS horaire,
            c.type
        FROM creneaux c
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        ORDER BY
            FIELD(c.jour, 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
            h.label,
            cl.nom,
            m.nom
    ")->fetchAll();

    $presences = $pdo->query("
        SELECT
            p.id,
            p.creneau_id,
            p.enseignant_id,
            p.date_cours,
            p.statut,
            p.scanned_at,
            p.mode_pointage,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            c.jour,
            h.label AS horaire
        FROM presences_enseignants p
        JOIN creneaux c ON c.id = p.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = p.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        ORDER BY p.date_cours DESC, p.scanned_at DESC, p.id DESC
        LIMIT 80
    ")->fetchAll();

    $tokens = $pdo->query("
        SELECT
            q.id,
            q.token,
            q.creneau_id,
            q.date_cours,
            q.expires_at,
            q.used_at,
            q.actif,
            q.created_at,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            s.nom AS salle,
            c.jour,
            h.label AS horaire
        FROM qr_cours_tokens q
        JOIN creneaux c ON c.id = q.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        ORDER BY q.created_at DESC
        LIMIT 30
    ")->fetchAll();

    json_response(true, "OK", [
        "creneaux" => $creneaux,
        "presences" => $presences,
        "tokens" => $tokens
    ]);
}

function get_creneau($pdo, $creneauId) {
    $stmt = $pdo->prepare("
        SELECT
            c.id,
            c.enseignant_id,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            c.jour,
            h.label AS horaire,
            c.type
        FROM creneaux c
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        WHERE c.id = :id
        LIMIT 1
    ");

    $stmt->execute([":id" => $creneauId]);

    return $stmt->fetch();
}

function generate_qr($pdo) {
    $data = body();

    $creneauId = (int)($data["creneau_id"] ?? 0);
    $dateCours = trim($data["date_cours"] ?? date("Y-m-d"));
    $minutesValid = (int)($data["minutes_valid"] ?? 180);
    $scanBaseUrl = trim($data["scan_base_url"] ?? "");

    if ($creneauId <= 0) {
        json_response(false, "Créneau invalide.", null, 400);
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateCours)) {
        json_response(false, "Date de cours invalide.", null, 400);
    }

    if ($minutesValid < 5) {
        $minutesValid = 5;
    }

    if ($minutesValid > 1440) {
        $minutesValid = 1440;
    }

    $creneau = get_creneau($pdo, $creneauId);

    if (!$creneau) {
        json_response(false, "Créneau introuvable.", null, 404);
    }

    $token = bin2hex(random_bytes(24));
    $expiresAt = date("Y-m-d H:i:s", time() + ($minutesValid * 60));

    $stmt = $pdo->prepare("
        INSERT INTO qr_cours_tokens
            (token, creneau_id, date_cours, expires_at, actif, created_by)
        VALUES
            (:token, :creneau_id, :date_cours, :expires_at, 1, :created_by)
    ");

    $stmt->execute([
        ":token" => $token,
        ":creneau_id" => $creneauId,
        ":date_cours" => $dateCours,
        ":expires_at" => $expiresAt,
        ":created_by" => trim($data["created_by"] ?? "")
    ]);

    if ($scanBaseUrl === "") {
        $scanBaseUrl = "http://127.0.0.1/EduSchedule-Pro/backend/api/teacher_qr.php";
    }

    $separator = str_contains($scanBaseUrl, "?") ? "&" : "?";
    $scanUrl = $scanBaseUrl . $separator . "action=scan&token=" . urlencode($token);

    json_response(true, "QR code généré.", [
        "token" => $token,
        "scan_url" => $scanUrl,
        "expires_at" => $expiresAt,
        "creneau" => $creneau
    ]);
}

function scan_qr($pdo) {
    $token = trim($_GET["token"] ?? "");

    if ($token === "") {
        html_response(
            "QR code invalide",
            "Le lien scanné ne contient pas de jeton valide.",
            "",
            "error",
            400
        );
    }

    $stmt = $pdo->prepare("
        SELECT
            q.id AS token_id,
            q.token,
            q.creneau_id,
            q.date_cours,
            q.expires_at,
            q.used_at,
            q.actif,
            c.enseignant_id,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            c.jour,
            h.label AS horaire
        FROM qr_cours_tokens q
        JOIN creneaux c ON c.id = q.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        WHERE q.token = :token
        LIMIT 1
    ");

    $stmt->execute([":token" => $token]);
    $qr = $stmt->fetch();

    if (!$qr) {
        html_response(
            "QR code introuvable",
            "Ce QR code n’existe pas ou n’est plus reconnu par le système.",
            "",
            "error",
            404
        );
    }

    if ((int)$qr["actif"] !== 1) {
        html_response(
            "QR code désactivé",
            "Ce QR code n’est plus actif.",
            "",
            "error",
            403
        );
    }

    $now = new DateTime();
    $expiresAt = new DateTime($qr["expires_at"]);

    if ($now > $expiresAt) {
        html_response(
            "QR code expiré",
            "Ce QR code n’est plus valide. Demande un nouveau QR code au surveillant ou à l’administration.",
            "Expiration : " . htmlspecialchars($qr["expires_at"]),
            "warning",
            410
        );
    }

    $status = compute_presence_status($qr["date_cours"], $qr["horaire"]);
    $ip = $_SERVER["REMOTE_ADDR"] ?? "";
    $agent = $_SERVER["HTTP_USER_AGENT"] ?? "";
    $scannedAt = date("Y-m-d H:i:s");

    $insert = $pdo->prepare("
        INSERT INTO presences_enseignants
            (creneau_id, enseignant_id, date_cours, statut, scanned_at, mode_pointage, token, ip_address, user_agent)
        VALUES
            (:creneau_id, :enseignant_id, :date_cours, :statut, :scanned_at, 'qr', :token, :ip_address, :user_agent)
        ON DUPLICATE KEY UPDATE
            statut = VALUES(statut),
            scanned_at = VALUES(scanned_at),
            mode_pointage = 'qr',
            token = VALUES(token),
            ip_address = VALUES(ip_address),
            user_agent = VALUES(user_agent),
            updated_at = CURRENT_TIMESTAMP
    ");

    $insert->execute([
        ":creneau_id" => $qr["creneau_id"],
        ":enseignant_id" => $qr["enseignant_id"],
        ":date_cours" => $qr["date_cours"],
        ":statut" => $status,
        ":scanned_at" => $scannedAt,
        ":token" => $token,
        ":ip_address" => $ip,
        ":user_agent" => $agent
    ]);

    $pdo->prepare("
        UPDATE qr_cours_tokens
        SET used_at = :used_at
        WHERE token = :token
    ")->execute([
        ":used_at" => $scannedAt,
        ":token" => $token
    ]);

    $statusLabel = $status === "retard" ? "Retard enregistré" : "Présence enregistrée";
    $details = "
        <strong>Professeur :</strong> " . htmlspecialchars($qr["enseignant"]) . "<br>
        <strong>Matière :</strong> " . htmlspecialchars($qr["matiere"]) . "<br>
        <strong>Classe :</strong> " . htmlspecialchars($qr["classe"]) . "<br>
        <strong>Salle :</strong> " . htmlspecialchars($qr["salle"]) . "<br>
        <strong>Horaire :</strong> " . htmlspecialchars($qr["horaire"]) . "<br>
        <strong>Pointage :</strong> " . htmlspecialchars($scannedAt) . "
    ";

    html_response(
        $statusLabel,
        "Votre pointage professeur a bien été pris en compte.",
        $details,
        $status === "retard" ? "warning" : "success",
        200
    );
}

function compute_presence_status($dateCours, $horaireLabel) {
    $parsed = parse_horaire($horaireLabel);

    if (!$parsed) {
        return "present";
    }

    $start = new DateTime($dateCours . " " . $parsed["start"]);
    $limit = clone $start;
    $limit->modify("+15 minutes");

    $now = new DateTime();

    if ($now > $limit) {
        return "retard";
    }

    return "present";
}

function parse_horaire($value) {
    $text = trim((string)$value);
    $text = str_replace(["[", "]"], "", $text);

    if (!preg_match('/(\d{1,2})h?(\d{2})?\s*[-:à]\s*(\d{1,2})h?(\d{2})?/i', $text, $m)) {
        return null;
    }

    $sh = str_pad($m[1], 2, "0", STR_PAD_LEFT);
    $sm = isset($m[2]) && $m[2] !== "" ? str_pad($m[2], 2, "0", STR_PAD_LEFT) : "00";
    $eh = str_pad($m[3], 2, "0", STR_PAD_LEFT);
    $em = isset($m[4]) && $m[4] !== "" ? str_pad($m[4], 2, "0", STR_PAD_LEFT) : "00";

    return [
        "start" => "$sh:$sm:00",
        "end" => "$eh:$em:00"
    ];
}

$pdo = db();
$action = $_GET["action"] ?? "list";

try {
    if ($action === "list") {
        list_data($pdo);
    }

    if ($action === "generate") {
        generate_qr($pdo);
    }

    if ($action === "scan") {
        scan_qr($pdo);
    }

    json_response(false, "Action inconnue.", null, 404);
} catch (Throwable $e) {
    json_response(false, "Erreur serveur : " . $e->getMessage(), null, 500);
}