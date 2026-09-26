<?php
declare(strict_types=1);

function eyexLocalizedMessage(string $spanish): string {
    $accept = strtolower(trim((string)($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')));
    if (!str_starts_with($accept, 'en')) return $spanish;
    $translations = [
        'Tipo de daltonismo no soportado' => 'Unsupported color vision type',
        'JSON de entrada inválido' => 'Invalid JSON request',
        'hex debe usar formato #RRGGBB' => 'hex must use #RRGGBB format',
        'cada color debe usar formato #RRGGBB' => 'each color must use #RRGGBB format',
        'severity debe estar entre 0 y 1' => 'severity must be between 0 and 1',
        'colors debe contener entre 1 y 256 colores' => 'colors must contain between 1 and 256 colors',
        'high_contrast debe ser true o false' => 'high_contrast must be true or false',
        'severity debe ser mild, moderate o severe' => 'severity must be mild, moderate or severe',
        'mode debe ser dark o light' => 'mode must be dark or light',
        'palette es requerido' => 'palette is required',
        'Feedback inválido' => 'Invalid feedback',
        'Recurso no encontrado' => 'Resource not found',
        'Error interno del servidor' => 'Internal server error',
    ];
    if (isset($translations[$spanish])) return $translations[$spanish];
    if (preg_match('/^([a-z_]+) debe usar formato #RRGGBB$/', $spanish, $m) === 1) {
        return $m[1] . ' must use #RRGGBB format';
    }
    return $spanish;
}

function eyexV150Suggest(array $answers): array {
    $protan = 0; $deutan = 0; $tritan = 0; $gray = 0;
    if (($answers['reds_look_darker'] ?? false) === true) $protan += 2;
    if (($answers['green_brown_confusion'] ?? false) === true) { $protan += 1; $deutan += 2; }
    if (($answers['blue_yellow_confusion'] ?? false) === true) $tritan += 3;
    if (($answers['colors_look_gray'] ?? false) === true) $gray += 4;
    if (($answers['red_green_confusion'] ?? false) === true) { $protan += 1; $deutan += 2; }
    if (($answers['red_black_confusion'] ?? false) === true) $protan += 2;
    if (($answers['blue_green_confusion'] ?? false) === true) { $tritan += 2; $deutan += 1; }
    if (($answers['yellow_pink_confusion'] ?? false) === true) $tritan += 2;
    if (($answers['low_saturation_confusion'] ?? false) === true) $gray += 2;

    $suggested = 'normal'; $max = 0;
    foreach ([
        'achromatopsia' => $gray,
        'tritanopia' => $tritan,
        'protanopia' => $protan,
        'deuteranopia' => $deutan,
    ] as $type => $score) {
        if ($score > $max) { $max = $score; $suggested = $type; }
    }
    $severity = ($max >= 5 || $suggested === 'achromatopsia') ? 'severe' : ($max >= 3 ? 'moderate' : 'mild');
    return [
        'suggested_type' => $suggested,
        'severity' => $severity,
        'high_contrast' => $suggested === 'achromatopsia' || $max >= 5,
        'disclaimer' => 'Resultado orientativo. No es un diagnóstico médico.',
    ];
}

function eyexV150Feedback(mixed $body): array {
    if (!is_array($body) || !is_string($body['suggested_type'] ?? null) || !in_array($body['suggested_type'], SUPPORTED_TYPES, true) || !array_key_exists('helpful', $body) || !is_bool($body['helpful'])) {
        return [400, ['error' => 'invalid_feedback', 'message' => 'Feedback inválido']];
    }
    error_log(sprintf('eyex_feedback suggested_type=%s helpful=%s', $body['suggested_type'], $body['helpful'] ? 'true' : 'false'));
    return [200, ['status' => 'recorded']];
}
