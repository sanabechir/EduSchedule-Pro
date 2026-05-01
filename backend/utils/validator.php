<?php

function requireFields($data, $fields) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            error("Champ requis: $field", 400);
        }
    }
}

function isEmail($email) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error("Email invalide", 400);
    }
}