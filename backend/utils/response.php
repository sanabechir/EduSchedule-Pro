<?php
function jsonResponse($data = [], $message = "OK", $code = 200) {
    http_response_code($code);
    echo json_encode([
        "success" => true,
        "message" => $message,
        "data" => $data
    ]);
    exit();
}

function errorResponse($message = "Erreur serveur", $code = 500) {
    http_response_code($code);
    echo json_encode([
        "success" => false,
        "message" => $message
    ]);
    exit();
}