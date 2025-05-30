package ai_api

import (
	"encoding/json"
	"time"

	"github.com/APIParkLab/APIPark/stores/api"
)

type API struct {
	ID               string
	Name             string
	Service          string
	Path             string
	Description      string
	Timeout          int
	Retry            int
	Model            string
	Provider         string
	CreateAt         time.Time
	UpdateAt         time.Time
	UseToken         int
	Creator          string
	Updater          string
	Type             int
	AdditionalConfig map[string]interface{}
	Disable          bool
}

type Create struct {
	ID               string
	Name             string
	Service          string
	Path             string
	Description      string
	Timeout          int
	Retry            int
	Model            string
	Provider         string
	AdditionalConfig map[string]interface{}
	Type             int
	Disable          bool
}

type Edit struct {
	Name             *string
	Path             *string
	Description      *string
	Timeout          *int
	Retry            *int
	Provider         *string
	Model            *string
	Disable          *bool
	UseToken         *int
	Type             *int
	AdditionalConfig *map[string]interface{}
}

func FromEntity(e *api.AiAPIInfo) *API {
	cfg := make(map[string]interface{})
	if e.AdditionalConfig != "" {
		_ = json.Unmarshal([]byte(e.AdditionalConfig), &cfg)
	}
	return &API{
		ID:               e.Uuid,
		Name:             e.Name,
		Service:          e.Service,
		Path:             e.Path,
		Description:      e.Description,
		Timeout:          e.Timeout,
		Retry:            e.Retry,
		Model:            e.Model,
		CreateAt:         e.CreateAt,
		UpdateAt:         e.UpdateAt,
		Creator:          e.Creator,
		Updater:          e.Updater,
		Disable:          e.Disable,
		UseToken:         e.UseToken,
		Provider:         e.Provider,
		Type:             e.Type,
		AdditionalConfig: cfg,
	}
}

type APIUse struct {
	API         string
	InputToken  int
	OutputToken int
	TotalToken  int
}

type IncrAPIUse struct {
	API         string
	Service     string
	Provider    string
	Model       string
	Day         int64
	Hour        int64
	Minute      int64
	InputToken  int
	OutputToken int
	TotalToken  int
}
