<?php

function logAction($conn, $user_id, $action) {
    $stmt = $conn->prepare("INSERT INTO logs_activite (utilisateur_id, action) VALUES (?, ?)");
    $stmt->execute([$user_id, $action]);
}