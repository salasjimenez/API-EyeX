export type V150ThemeType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' | 'low_vision';

export interface V150Answers {
  reds_look_darker?: boolean;
  green_brown_confusion?: boolean;
  blue_yellow_confusion?: boolean;
  colors_look_gray?: boolean;
  red_green_confusion?: boolean;
  red_black_confusion?: boolean;
  blue_green_confusion?: boolean;
  yellow_pink_confusion?: boolean;
  low_saturation_confusion?: boolean;
}

export interface FeedbackRequest {
  suggested_type?: unknown;
  helpful?: unknown;
}

export function suggestV150(a: V150Answers) {
  let protan = 0;
  let deutan = 0;
  let tritan = 0;
  let gray = 0;
  if (a.reds_look_darker) protan += 2;
  if (a.green_brown_confusion) { protan += 1; deutan += 2; }
  if (a.blue_yellow_confusion) tritan += 3;
  if (a.colors_look_gray) gray += 4;
  if (a.red_green_confusion) { protan += 1; deutan += 2; }
  if (a.red_black_confusion) protan += 2;
  if (a.blue_green_confusion) { tritan += 2; deutan += 1; }
  if (a.yellow_pink_confusion) tritan += 2;
  if (a.low_saturation_confusion) gray += 2;

  let suggested_type: V150ThemeType = 'normal';
  let maxScore = 0;
  for (const [type, score] of [
    ['achromatopsia', gray],
    ['tritanopia', tritan],
    ['protanopia', protan],
    ['deuteranopia', deutan],
  ] as const) {
    if (score > maxScore) {
      maxScore = score;
      suggested_type = type;
    }
  }

  const severity = maxScore >= 5 || suggested_type === 'achromatopsia'
    ? 'severe'
    : maxScore >= 3 ? 'moderate' : 'mild';
  return {
    suggested_type,
    severity,
    high_contrast: suggested_type === 'achromatopsia' || maxScore >= 5,
    disclaimer: 'Resultado orientativo. No es un diagnóstico médico.',
  };
}

export function validateFeedback(body: FeedbackRequest, supportedTypes: readonly string[]): { suggested_type: string; helpful: boolean } | null {
  if (typeof body?.suggested_type !== 'string' || !supportedTypes.includes(body.suggested_type) || typeof body.helpful !== 'boolean') return null;
  return { suggested_type: body.suggested_type, helpful: body.helpful };
}

export function localizedMessage(acceptLanguage: unknown, spanish: string): string {
  const value = Array.isArray(acceptLanguage) ? String(acceptLanguage[0] || '') : String(acceptLanguage || '');
  if (!value.trim().toLowerCase().startsWith('en')) return spanish;
  const translations: Record<string, string> = {
    'Tipo de daltonismo no soportado': 'Unsupported color vision type',
    'JSON de entrada inválido': 'Invalid JSON request',
    'hex debe usar formato #RRGGBB': 'hex must use #RRGGBB format',
    'cada color debe usar formato #RRGGBB': 'each color must use #RRGGBB format',
    'severity debe estar entre 0 y 1': 'severity must be between 0 and 1',
    'colors debe contener entre 1 y 256 colores': 'colors must contain between 1 and 256 colors',
    'high_contrast debe ser true o false': 'high_contrast must be true or false',
    'severity debe ser mild, moderate o severe': 'severity must be mild, moderate or severe',
    'mode debe ser dark o light': 'mode must be dark or light',
    'palette es requerido': 'palette is required',
    'Feedback inválido': 'Invalid feedback',
    'Recurso no encontrado': 'Resource not found',
    'Error interno del servidor': 'Internal server error',
  };
  const direct = translations[spanish];
  if (direct) return direct;
  const paletteField = /^([a-z_]+) debe usar formato #RRGGBB$/.exec(spanish);
  return paletteField ? `${paletteField[1]} must use #RRGGBB format` : spanish;
}
