package com.eyex.api.web;

import com.eyex.api.model.ErrorResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.Map;

@RestControllerAdvice
public class ErrorLocalizationAdvice implements ResponseBodyAdvice<Object> {
    private static final Map<String, String> ENGLISH = Map.ofEntries(
            Map.entry("Tipo de daltonismo no soportado", "Unsupported color vision type"),
            Map.entry("JSON de entrada inválido", "Invalid JSON request"),
            Map.entry("hex debe usar formato #RRGGBB", "hex must use #RRGGBB format"),
            Map.entry("cada color debe usar formato #RRGGBB", "each color must use #RRGGBB format"),
            Map.entry("severity debe estar entre 0 y 1", "severity must be between 0 and 1"),
            Map.entry("colors debe contener entre 1 y 256 colores", "colors must contain between 1 and 256 colors"),
            Map.entry("high_contrast debe ser true o false", "high_contrast must be true or false"),
            Map.entry("severity debe ser mild, moderate o severe", "severity must be mild, moderate or severe"),
            Map.entry("mode debe ser dark o light", "mode must be dark or light"),
            Map.entry("palette es requerido", "palette is required"),
            Map.entry("Feedback inválido", "Invalid feedback"),
            Map.entry("Recurso no encontrado", "Resource not found"),
            Map.entry("Error interno del servidor", "Internal server error")
    );

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (!(body instanceof ErrorResponse error)) return body;
        String acceptLanguage = request.getHeaders().getFirst("Accept-Language");
        return new ErrorResponse(error.error(), localized(acceptLanguage, error.message()));
    }

    private static String localized(String acceptLanguage, String spanish) {
        if (acceptLanguage == null || !acceptLanguage.trim().toLowerCase().startsWith("en")) return spanish;
        String direct = ENGLISH.get(spanish);
        if (direct != null) return direct;
        if (spanish != null && spanish.matches("^[a-z_]+ debe usar formato #RRGGBB$")) {
            return spanish.substring(0, spanish.indexOf(' ')) + " must use #RRGGBB format";
        }
        return spanish;
    }
}
