package com.eyex.api.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record FeedbackRequest(
        @JsonProperty("suggested_type") String suggestedType,
        Boolean helpful
) {}
