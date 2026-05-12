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

function ensure_tables($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS teacher_qr_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(100) NOT NULL UNIQUE,
            creneau_id INT NOT NULL,
            date_cours DATE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_by VARCHAR(150) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (token),
            INDEX (creneau_id),
            INDEX (date_cours)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS presences_professeurs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token_id INT NULL,
            creneau_id INT NOT NULL,
            enseignant_id INT NOT NULL,
            date_cours DATE NOT NULL,
            statut ENUM('present', 'retard') NOT NULL DEFAULT 'present',
            scanned_at DATETIME NOT NULL,
            device_info TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_presence_course_teacher_date (creneau_id, enseignant_id, date_cours),
            INDEX (token_id),
            INDEX (creneau_id),
            INDEX (enseignant_id),
            INDEX (date_cours),
            INDEX (statut)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function is_private_lan_ip($ip) {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return false;
    }

    if ($ip === "127.0.0.1" || strpos($ip, "169.254.") === 0) {
        return false;
    }

    if (strpos($ip, "10.") === 0) {
        return true;
    }

    if (strpos($ip, "192.168.") === 0) {
        return true;
    }

    if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $ip)) {
        return true;
    }

    return false;
}

function ip_score($ip) {
    $score = 0;

    if (strpos($ip, "192.168.") === 0) {
        $score += 50;
    }

    if (strpos($ip, "10.") === 0) {
        $score += 35;
    }

    if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $ip)) {
        $score += 30;
    }

    // On pénalise les réseaux virtuels souvent utilisés par VirtualBox / VMware / VPN.
    if (
        strpos($ip, "192.168.56.") === 0 ||
        strpos($ip, "192.168.8.") === 0 ||
        strpos($ip, "192.168.80.") === 0
    ) {
        $score -= 40;
    }

    // Ton réseau Wi-Fi récent était en 192.168.11.x, on le priorise si présent.
    if (strpos($ip, "192.168.11.") === 0) {
        $score += 50;
    }

    return $score;
}

function get_lan_ip_candidates() {
    $ips = [];

    $serverCandidates = [
        $_SERVER["LOCAL_ADDR"] ?? "",
        $_SERVER["SERVER_ADDR"] ?? "",
        $_SERVER["HTTP_HOST"] ?? ""
    ];

    foreach ($serverCandidates as $candidate) {
        $candidate = trim((string)$candidate);
        $candidate = preg_replace('/:\d+$/', '', $candidate);

        if (is_private_lan_ip($candidate)) {
            $ips[] = $candidate;
        }
    }

    if (function_exists("shell_exec")) {
        $output = @shell_exec("ipconfig 2>NUL");

        if ($output) {
            preg_match_all('/(?:IPv4[^:\r\n]*|Adresse IPv4[^:\r\n]*)[^\r\n:]*:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})/iu', $output, $matches);

            if (!empty($matches[1])) {
                foreach ($matches[1] as $ip) {
                    if (is_private_lan_ip($ip)) {
                        $ips[] = $ip;
                    }
                }
            }
        }
    }

    $ips = array_values(array_unique($ips));

    usort($ips, function ($a, $b) {
        return ip_score($b) <=> ip_score($a);
    });

    return $ips;
}

function get_network_info() {
    $candidates = get_lan_ip_candidates();
    $ip = $candidates[0] ?? null;

    if (!$ip) {
        $host = $_SERVER["HTTP_HOST"] ?? "127.0.0.1";
        $host = preg_replace('/:\d+$/', '', $host);

        if ($host === "localhost") {
            $host = "127.0.0.1";
        }

        $ip = $host;
    }

    $scheme = "http";
    $port = $_SERVER["SERVER_PORT"] ?? "80";
    $portPart = ($port && $port !== "80") ? ":" . $port : "";

    $scriptPath = $_SERVER["SCRIPT_NAME"] ?? "/EduSchedule-Pro/backend/api/teacher_qr.php";

    $mobileUrl = $scheme . "://" . $ip . $portPart . $scriptPath;

    return [
        "ip" => $ip,
        "mobile_url" => $mobileUrl,
        "candidates" => $candidates,
        "note" => "Utilise cette URL sur un téléphone connecté au même Wi-Fi que le PC."
    ];
}

function network_action() {
    json_response(true, "Adresse réseau détectée.", get_network_info());
}

function get_creneau($pdo, $id) {
    $stmt = $pdo->prepare("
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
        WHERE c.id = :id
        LIMIT 1
    ");

    $stmt->execute([":id" => $id]);
    return $stmt->fetch();
}

function parse_horaire($label) {
    $text = trim((string)$label);

    $text = str_replace(["[", "]"], "", $text);
    $text = str_replace(["H", " "], ["h", ""], $text);
    $text = str_replace(["à", "–", "—", ":"], "-", $text);

    if (!preg_match('/^(\d{1,2})h?(\d{2})?-(\d{1,2})h?(\d{2})?$/i', $text, $m)) {
        return null;
    }

    $sh = (int)$m[1];
    $sm = isset($m[2]) && $m[2] !== "" ? (int)$m[2] : 0;
    $eh = (int)$m[3];
    $em = isset($m[4]) && $m[4] !== "" ? (int)$m[4] : 0;

    if ($sh > 23 || $eh > 23 || $sm > 59 || $em > 59) {
        return null;
    }

    return [
        "start" => sprintf("%02d:%02d:00", $sh, $sm),
        "end" => sprintf("%02d:%02d:00", $eh, $em),
        "start_label" => sprintf("%02dh%02d", $sh, $sm),
        "end_label" => sprintf("%02dh%02d", $eh, $em)
    ];
}

function get_scan_status($dateCours, $horaireLabel) {
    $parsed = parse_horaire($horaireLabel);

    if (!$parsed) {
        return [
            "allowed" => false,
            "statut" => null,
            "title" => "Horaire invalide",
            "message" => "Impossible de lire l’horaire du cours.",
            "type" => "error"
        ];
    }

    $now = new DateTime("now", new DateTimeZone("Africa/Ouagadougou"));

    $start = new DateTime($dateCours . " " . $parsed["start"], new DateTimeZone("Africa/Ouagadougou"));
    $end = new DateTime($dateCours . " " . $parsed["end"], new DateTimeZone("Africa/Ouagadougou"));

    $openBefore = clone $start;
    $openBefore->modify("-10 minutes");

    $presentLimit = clone $start;
    $presentLimit->modify("+15 minutes");

    $lateLimit = clone $end;
    $lateLimit->modify("+30 minutes");

    if ($now < $openBefore) {
        return [
            "allowed" => false,
            "statut" => null,
            "title" => "Pointage trop tôt",
            "message" => "Le pointage ouvrira 10 minutes avant le début du cours.",
            "type" => "warning",
            "now" => $now->format("Y-m-d H:i:s"),
            "start" => $start->format("Y-m-d H:i:s"),
            "end" => $end->format("Y-m-d H:i:s")
        ];
    }

    if ($now >= $openBefore && $now <= $presentLimit) {
        return [
            "allowed" => true,
            "statut" => "present",
            "title" => "Présence enregistrée",
            "message" => "Votre pointage professeur a bien été pris en compte.",
            "type" => "success",
            "now" => $now->format("Y-m-d H:i:s"),
            "start" => $start->format("Y-m-d H:i:s"),
            "end" => $end->format("Y-m-d H:i:s")
        ];
    }

    if ($now > $presentLimit && $now <= $lateLimit) {
        return [
            "allowed" => true,
            "statut" => "retard",
            "title" => "Retard enregistré",
            "message" => "Votre pointage professeur a bien été pris en compte.",
            "type" => "warning",
            "now" => $now->format("Y-m-d H:i:s"),
            "start" => $start->format("Y-m-d H:i:s"),
            "end" => $end->format("Y-m-d H:i:s")
        ];
    }

    return [
        "allowed" => false,
        "statut" => null,
        "title" => "Pointage fermé",
        "message" => "Le délai de pointage pour ce cours est terminé.",
        "type" => "error",
        "now" => $now->format("Y-m-d H:i:s"),
        "start" => $start->format("Y-m-d H:i:s"),
        "end" => $end->format("Y-m-d H:i:s")
    ];
}

function list_data($pdo) {
    ensure_tables($pdo);

    $creneaux = $pdo->query("
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
            FIELD(c.jour, 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'),
            h.label,
            cl.nom,
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

    $presences = $pdo->query("
        SELECT
            p.id,
            p.token_id,
            p.creneau_id,
            p.enseignant_id,
            p.date_cours,
            p.statut,
            p.scanned_at,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            e.email AS enseignant_email,
            s.nom AS salle,
            h.label AS horaire,
            c.jour
        FROM presences_professeurs p
        JOIN creneaux c ON c.id = p.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        ORDER BY p.scanned_at DESC
        LIMIT 300
    ")->fetchAll();

    $tokens = $pdo->query("
        SELECT
            t.id,
            t.token,
            t.creneau_id,
            t.date_cours,
            t.expires_at,
            t.created_by,
            t.created_at,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            s.nom AS salle,
            h.label AS horaire,
            c.jour
        FROM teacher_qr_tokens t
        JOIN creneaux c ON c.id = t.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        ORDER BY t.created_at DESC
        LIMIT 150
    ")->fetchAll();

    json_response(true, "OK", [
        "creneaux" => $creneaux,
        "classes" => $classes,
        "enseignants" => $enseignants,
        "presences" => $presences,
        "tokens" => $tokens,
        "network" => get_network_info()
    ]);
}

function generate_qr($pdo) {
    ensure_tables($pdo);

    $data = body();

    $creneauId = (int)($data["creneau_id"] ?? 0);
    $dateCours = trim((string)($data["date_cours"] ?? ""));
    $minutesValid = (int)($data["minutes_valid"] ?? 240);
    $scanBaseUrl = trim((string)($data["scan_base_url"] ?? ""));
    $createdBy = trim((string)($data["created_by"] ?? ""));

    if ($scanBaseUrl === "") {
        $network = get_network_info();
        $scanBaseUrl = $network["mobile_url"];
    }

    if ($creneauId <= 0 || $dateCours === "" || $scanBaseUrl === "") {
        json_response(false, "Cours, date et URL mobile obligatoires.", null, 400);
    }

    if ($minutesValid <= 0) {
        $minutesValid = 240;
    }

    $creneau = get_creneau($pdo, $creneauId);

    if (!$creneau) {
        json_response(false, "Créneau introuvable.", null, 404);
    }

    $token = bin2hex(random_bytes(24));

    $now = new DateTime("now", new DateTimeZone("Africa/Ouagadougou"));
    $expires = clone $now;
    $expires->modify("+{$minutesValid} minutes");

    $stmt = $pdo->prepare("
        INSERT INTO teacher_qr_tokens
            (token, creneau_id, date_cours, expires_at, created_by)
        VALUES
            (:token, :creneau_id, :date_cours, :expires_at, :created_by)
    ");

    $stmt->execute([
        ":token" => $token,
        ":creneau_id" => $creneauId,
        ":date_cours" => $dateCours,
        ":expires_at" => $expires->format("Y-m-d H:i:s"),
        ":created_by" => $createdBy !== "" ? $createdBy : null
    ]);

    $scanBaseUrl = rtrim($scanBaseUrl, "?&");
    $separator = strpos($scanBaseUrl, "?") === false ? "?" : "&";
    $scanUrl = $scanBaseUrl . $separator . "action=scan&token=" . urlencode($token);

    json_response(true, "QR code généré.", [
        "token" => $token,
        "scan_url" => $scanUrl,
        "expires_at" => $expires->format("Y-m-d H:i:s"),
        "creneau" => $creneau
    ]);
}

function scan_qr($pdo) {
    ensure_tables($pdo);

    $token = trim((string)($_GET["token"] ?? ""));

    if ($token === "") {
        render_scan_page([
            "title" => "QR code invalide",
            "message" => "Aucun token de pointage n’a été fourni.",
            "type" => "error"
        ]);
    }

    $stmt = $pdo->prepare("
        SELECT
            t.id AS token_id,
            t.token,
            t.creneau_id,
            t.date_cours,
            t.expires_at,
            c.enseignant_id,
            cl.nom AS classe,
            m.nom AS matiere,
            CONCAT(e.nom, ' ', e.prenom) AS enseignant,
            s.nom AS salle,
            h.label AS horaire,
            c.jour
        FROM teacher_qr_tokens t
        JOIN creneaux c ON c.id = t.creneau_id
        JOIN classes cl ON cl.id = c.classe_id
        JOIN matieres m ON m.id = c.matiere_id
        JOIN enseignants e ON e.id = c.enseignant_id
        JOIN salles s ON s.id = c.salle_id
        JOIN horaires h ON h.id = c.horaire_id
        WHERE t.token = :token
        LIMIT 1
    ");

    $stmt->execute([":token" => $token]);
    $row = $stmt->fetch();

    if (!$row) {
        render_scan_page([
            "title" => "QR code introuvable",
            "message" => "Ce QR code n’existe pas ou n’est plus valide.",
            "type" => "error"
        ]);
    }

    $now = new DateTime("now", new DateTimeZone("Africa/Ouagadougou"));
    $expiresAt = new DateTime($row["expires_at"], new DateTimeZone("Africa/Ouagadougou"));

    if ($now > $expiresAt) {
        render_scan_page([
            "title" => "QR code expiré",
            "message" => "La durée de validité de ce QR code est terminée.",
            "type" => "error",
            "course" => $row,
            "scanned_at" => $now->format("Y-m-d H:i:s")
        ]);
    }

    $status = get_scan_status($row["date_cours"], $row["horaire"]);

    if (!$status["allowed"]) {
        render_scan_page([
            "title" => $status["title"],
            "message" => $status["message"],
            "type" => $status["type"],
            "course" => $row,
            "scanned_at" => $now->format("Y-m-d H:i:s"),
            "start_at" => $status["start"] ?? null,
            "end_at" => $status["end"] ?? null
        ]);
    }

    $existing = $pdo->prepare("
        SELECT id, statut, scanned_at
        FROM presences_professeurs
        WHERE creneau_id = :creneau_id
        AND enseignant_id = :enseignant_id
        AND date_cours = :date_cours
        LIMIT 1
    ");

    $existing->execute([
        ":creneau_id" => $row["creneau_id"],
        ":enseignant_id" => $row["enseignant_id"],
        ":date_cours" => $row["date_cours"]
    ]);

    $already = $existing->fetch();

    if ($already) {
        $row["statut"] = $already["statut"];
        $row["scanned_at"] = $already["scanned_at"];

        render_scan_page([
            "title" => "Déjà pointé",
            "message" => "Ce cours a déjà été pointé.",
            "type" => $already["statut"] === "present" ? "success" : "warning",
            "course" => $row,
            "scanned_at" => $already["scanned_at"]
        ]);
    }

    $insert = $pdo->prepare("
        INSERT INTO presences_professeurs
            (token_id, creneau_id, enseignant_id, date_cours, statut, scanned_at, device_info)
        VALUES
            (:token_id, :creneau_id, :enseignant_id, :date_cours, :statut, :scanned_at, :device_info)
    ");

    $insert->execute([
        ":token_id" => $row["token_id"],
        ":creneau_id" => $row["creneau_id"],
        ":enseignant_id" => $row["enseignant_id"],
        ":date_cours" => $row["date_cours"],
        ":statut" => $status["statut"],
        ":scanned_at" => $now->format("Y-m-d H:i:s"),
        ":device_info" => $_SERVER["HTTP_USER_AGENT"] ?? null
    ]);

    $row["statut"] = $status["statut"];
    $row["scanned_at"] = $now->format("Y-m-d H:i:s");

    render_scan_page([
        "title" => $status["title"],
        "message" => $status["message"],
        "type" => $status["type"],
        "course" => $row,
        "scanned_at" => $now->format("Y-m-d H:i:s"),
        "start_at" => $status["start"] ?? null,
        "end_at" => $status["end"] ?? null
    ]);
}

function render_scan_page($data) {
    $type = $data["type"] ?? "success";

    $colors = [
        "success" => [
            "bg" => "#ecfdf5",
            "border" => "#86efac",
            "text" => "#166534",
            "icon" => "✓"
        ],
        "warning" => [
            "bg" => "#fffbeb",
            "border" => "#fde68a",
            "text" => "#92400e",
            "icon" => "!"
        ],
        "error" => [
            "bg" => "#fef2f2",
            "border" => "#fecaca",
            "text" => "#991b1b",
            "icon" => "×"
        ]
    ];

    $theme = $colors[$type] ?? $colors["success"];
    $course = $data["course"] ?? null;

    header("Content-Type: text/html; charset=utf-8");

    echo "<!DOCTYPE html>
<html lang='fr'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Pointage professeur</title>
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: linear-gradient(135deg, #f8fafc, #eef2ff);
      color: #0f172a;
      font-family: Arial, sans-serif;
    }

    .card {
      width: min(680px, 100%);
      padding: 38px 30px;
      border-radius: 32px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
      text-align: center;
    }

    .icon {
      width: 92px;
      height: 92px;
      display: grid;
      place-items: center;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: {$theme["bg"]};
      border: 4px solid {$theme["border"]};
      color: {$theme["text"]};
      font-size: 46px;
      font-weight: 950;
    }

    h1 {
      margin: 0;
      color: #0f172a;
      font-size: clamp(34px, 6vw, 52px);
      line-height: 1.1;
      font-weight: 950;
    }

    .message {
      max-width: 560px;
      margin: 22px auto 0;
      color: #475569;
      font-size: clamp(18px, 4vw, 26px);
      line-height: 1.45;
      font-weight: 800;
    }

    .details {
      margin-top: 34px;
      padding: 24px;
      border-radius: 24px;
      background: {$theme["bg"]};
      border: 2px solid {$theme["border"]};
      text-align: left;
      color: {$theme["text"]};
    }

    .details p {
      margin: 10px 0;
      font-size: clamp(17px, 3.8vw, 24px);
      line-height: 1.35;
      font-weight: 900;
    }

    .details span {
      color: #334155;
      font-weight: 950;
    }

    .footer {
      margin-top: 30px;
      color: #94a3b8;
      font-size: 18px;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <main class='card'>
    <div class='icon'>{$theme["icon"]}</div>
    <h1>" . htmlspecialchars($data["title"] ?? "Pointage", ENT_QUOTES, "UTF-8") . "</h1>
    <div class='message'>" . htmlspecialchars($data["message"] ?? "", ENT_QUOTES, "UTF-8") . "</div>";

    if ($course) {
        echo "
    <div class='details'>
      <p>Professeur : <span>" . htmlspecialchars($course["enseignant"] ?? "", ENT_QUOTES, "UTF-8") . "</span></p>
      <p>Matière : <span>" . htmlspecialchars($course["matiere"] ?? "", ENT_QUOTES, "UTF-8") . "</span></p>
      <p>Classe : <span>" . htmlspecialchars($course["classe"] ?? "", ENT_QUOTES, "UTF-8") . "</span></p>
      <p>Salle : <span>" . htmlspecialchars($course["salle"] ?? "", ENT_QUOTES, "UTF-8") . "</span></p>
      <p>Horaire : <span>" . htmlspecialchars($course["horaire"] ?? "", ENT_QUOTES, "UTF-8") . "</span></p>
      <p>Date du cours : <span>" . htmlspecialchars($course["date_cours"] ?? "", ENT_QUOTES, "UTF-8") . "</span></p>
      <p>Scan : <span>" . htmlspecialchars($data["scanned_at"] ?? "", ENT_QUOTES, "UTF-8") . "</span></p>
    </div>";
    }

    echo "
    <div class='footer'>EduSchedule Pro</div>
  </main>
</body>
</html>";

    exit;
}

$pdo = db();
$action = $_GET["action"] ?? "list";

try {
    if ($action === "network") {
        network_action();
    }

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