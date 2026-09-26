package handlers

import (
	"fmt"
	"net/http"

	"github.com/eyex-api/eyex/internal/theme"
)

type quickTestV150Answers struct {
	RedsLookDarker         bool `json:"reds_look_darker"`
	GreenBrownConfusion    bool `json:"green_brown_confusion"`
	BlueYellowConfusion    bool `json:"blue_yellow_confusion"`
	ColorsLookGray         bool `json:"colors_look_gray"`
	RedGreenConfusion      bool `json:"red_green_confusion,omitempty"`
	RedBlackConfusion      bool `json:"red_black_confusion,omitempty"`
	BlueGreenConfusion     bool `json:"blue_green_confusion,omitempty"`
	YellowPinkConfusion    bool `json:"yellow_pink_confusion,omitempty"`
	LowSaturationConfusion bool `json:"low_saturation_confusion,omitempty"`
}

type quickTestV150Request struct {
	Answers quickTestV150Answers `json:"answers"`
}

type quickTestV150Response struct {
	SuggestedType string `json:"suggested_type"`
	Severity      string `json:"severity"`
	HighContrast  bool   `json:"high_contrast"`
	Disclaimer    string `json:"disclaimer"`
}

type feedbackRequest struct {
	SuggestedType string `json:"suggested_type"`
	Helpful       *bool  `json:"helpful"`
}

type feedbackResponse struct {
	Status string `json:"status"`
}

func scoreSuggestion(a quickTestV150Answers) (string, string, bool) {
	protan, deutan, tritan, gray := 0, 0, 0, 0
	if a.RedsLookDarker {
		protan += 2
	}
	if a.GreenBrownConfusion {
		protan++
		deutan += 2
	}
	if a.BlueYellowConfusion {
		tritan += 3
	}
	if a.ColorsLookGray {
		gray += 4
	}
	if a.RedGreenConfusion {
		protan++
		deutan += 2
	}
	if a.RedBlackConfusion {
		protan += 2
	}
	if a.BlueGreenConfusion {
		tritan += 2
		deutan++
	}
	if a.YellowPinkConfusion {
		tritan += 2
	}
	if a.LowSaturationConfusion {
		gray += 2
	}

	typeValue, maxScore := "normal", 0
	for _, candidate := range []struct {
		typeValue string
		score     int
	}{
		{"achromatopsia", gray},
		{"tritanopia", tritan},
		{"protanopia", protan},
		{"deuteranopia", deutan},
	} {
		if candidate.score > maxScore {
			typeValue, maxScore = candidate.typeValue, candidate.score
		}
	}

	severity := theme.SeverityMild
	if maxScore >= 5 || typeValue == "achromatopsia" {
		severity = theme.SeveritySevere
	} else if maxScore >= 3 {
		severity = theme.SeverityModerate
	}
	return typeValue, severity, typeValue == "achromatopsia" || maxScore >= 5
}

func (a *API) quickTestV150(w http.ResponseWriter, r *http.Request) {
	var req quickTestV150Request
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "JSON de entrada inválido")
		return
	}
	typeValue, severity, highContrast := scoreSuggestion(req.Answers)
	writeJSON(w, http.StatusOK, quickTestV150Response{
		SuggestedType: typeValue,
		Severity:      severity,
		HighContrast:  highContrast,
		Disclaimer:    "Resultado orientativo. No es un diagnóstico médico.",
	})
}

func (a *API) feedback(w http.ResponseWriter, r *http.Request) {
	var req feedbackRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "JSON de entrada inválido")
		return
	}
	if !theme.IsSupportedType(req.SuggestedType) || req.Helpful == nil {
		writeError(w, r, http.StatusBadRequest, "invalid_feedback", "Feedback inválido")
		return
	}
	fmt.Printf("eyex_feedback suggested_type=%s helpful=%t\n", req.SuggestedType, *req.Helpful)
	writeJSON(w, http.StatusOK, feedbackResponse{Status: "recorded"})
}
