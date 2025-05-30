package service

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/APIParkLab/APIPark/module/monitor"
	monitor_dto "github.com/APIParkLab/APIPark/module/monitor/dto"

	ai_provider_local "github.com/APIParkLab/APIPark/ai-provider/local"

	subscribe_dto "github.com/APIParkLab/APIPark/module/subscribe/dto"

	"github.com/APIParkLab/APIPark/module/subscribe"

	ai_local "github.com/APIParkLab/APIPark/module/ai-local"

	ai_dto "github.com/APIParkLab/APIPark/module/ai/dto"

	api_doc_dto "github.com/APIParkLab/APIPark/module/api-doc/dto"

	"github.com/APIParkLab/APIPark/module/catalogue"

	"github.com/APIParkLab/APIPark/module/team"

	"github.com/eolinker/go-common/pm3"

	"github.com/APIParkLab/APIPark/module/system"

	"github.com/getkin/kin-openapi/openapi3"

	api_doc "github.com/APIParkLab/APIPark/module/api-doc"

	"github.com/eolinker/eosc/log"

	application_authorization "github.com/APIParkLab/APIPark/module/application-authorization"
	application_authorization_dto "github.com/APIParkLab/APIPark/module/application-authorization/dto"

	"github.com/APIParkLab/APIPark/model/plugin_model"
	"github.com/APIParkLab/APIPark/service/api"

	router_dto "github.com/APIParkLab/APIPark/module/router/dto"

	model_runtime "github.com/APIParkLab/APIPark/ai-provider/model-runtime"
	"github.com/APIParkLab/APIPark/module/ai"
	ai_api "github.com/APIParkLab/APIPark/module/ai-api"
	ai_api_dto "github.com/APIParkLab/APIPark/module/ai-api/dto"
	"github.com/APIParkLab/APIPark/module/router"
	"github.com/APIParkLab/APIPark/module/service"
	service_dto "github.com/APIParkLab/APIPark/module/service/dto"
	"github.com/APIParkLab/APIPark/module/upstream"
	"github.com/eolinker/go-common/store"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var (
	_ IServiceController = (*imlServiceController)(nil)

	_ IAppController = (*imlAppController)(nil)
)

type imlServiceController struct {
	module              service.IServiceModule          `autowired:""`
	docModule           service.IServiceDocModule       `autowired:""`
	subscribeModule     subscribe.ISubscribeModule      `autowired:""`
	aiAPIModule         ai_api.IAPIModule               `autowired:""`
	routerModule        router.IRouterModule            `autowired:""`
	apiDocModule        api_doc.IAPIDocModule           `autowired:""`
	providerModule      ai.IProviderModule              `autowired:""`
	aiLocalModel        ai_local.ILocalModelModule      `autowired:""`
	appModule           service.IAppModule              `autowired:""`
	upstreamModule      upstream.IUpstreamModule        `autowired:""`
	settingModule       system.ISettingModule           `autowired:""`
	teamModule          team.ITeamModule                `autowired:""`
	catalogueModule     catalogue.ICatalogueModule      `autowired:""`
	monitorModule       monitor.IMonitorStatisticModule `autowired:""`
	monitorConfigModule monitor.IMonitorConfigModule    `autowired:""`
	transaction         store.ITransaction              `autowired:""`
}

func (i *imlServiceController) RestLogInfo(ctx *gin.Context, serviceId string, logId string) (*service_dto.RestLogInfo, error) {
	return i.module.RestLogInfo(ctx, serviceId, logId)
}

func (i *imlServiceController) AILogInfo(ctx *gin.Context, serviceId string, logId string) (*service_dto.AILogInfo, error) {
	return i.module.AILogInfo(ctx, serviceId, logId)
}

func (i *imlServiceController) AILogs(ctx *gin.Context, serviceId string, start string, end string, page string, size string) ([]*service_dto.AILogItem, int64, error) {
	s, e, err := formatTime(start, end)
	if err != nil {
		return nil, 0, err
	}
	if serviceId == "" {
		return nil, 0, fmt.Errorf("service id is empty")
	}
	if page == "" {
		page = "1"
	}
	if size == "" {
		size = "20"
	}
	p, err := strconv.Atoi(page)
	if err != nil {
		return nil, 0, err
	}
	ps, err := strconv.Atoi(size)
	if err != nil {
		return nil, 0, err
	}

	return i.module.AILogs(ctx, serviceId, s, e, p, ps)
}

func (i *imlServiceController) RestLogs(ctx *gin.Context, serviceId string, start string, end string, page string, size string) ([]*service_dto.RestLogItem, int64, error) {
	s, e, err := formatTime(start, end)
	if err != nil {
		return nil, 0, err
	}
	if serviceId == "" {
		return nil, 0, fmt.Errorf("service id is empty")
	}
	if page == "" {
		page = "1"
	}
	if size == "" {
		size = "20"
	}
	p, err := strconv.Atoi(page)
	if err != nil {
		return nil, 0, err
	}
	ps, err := strconv.Atoi(size)
	if err != nil {
		return nil, 0, err
	}

	return i.module.RestLogs(ctx, serviceId, s, e, p, ps)
}

func (i *imlServiceController) ServiceOverview(ctx *gin.Context, serviceId string) (*service_dto.Overview, error) {
	o, err := i.module.ServiceOverview(ctx, serviceId)
	if err != nil {
		return nil, err
	}
	cfg, err := i.monitorConfigModule.GetMonitorConfig(ctx)
	if err != nil {
		return nil, err
	}
	if len(cfg.Config) < 1 {
		return o, nil
	}
	statistics, err := i.monitorModule.ProviderStatistics(ctx, &monitor_dto.StatisticInput{
		Services: []string{serviceId},
		CommonInput: &monitor_dto.CommonInput{
			Start: time.Now().Add(-24 * 30 * time.Hour).Unix(),
			End:   time.Now().Unix(),
		},
	})
	if err != nil {
		return nil, err
	}
	if len(statistics) < 1 {
		return o, nil
	}
	o.InvokeNum = statistics[0].RequestTotal
	return o, nil
}

func (i *imlServiceController) AIChartOverview(ctx *gin.Context, serviceId string, start string, end string) (*monitor_dto.ServiceChartAIOverview, error) {
	s, e, err := formatTime(start, end)
	if err != nil {
		return nil, err
	}
	if serviceId == "" {
		return nil, fmt.Errorf("service is required")
	}
	so, err := i.module.ServiceOverview(ctx, serviceId)
	if err != nil {
		return nil, err
	}
	result := &monitor_dto.ServiceChartAIOverview{
		EnableMCP:     so.EnableMCP,
		SubscriberNum: so.SubscriberNum,
		APINum:        so.APINum,
		ServiceKind:   so.ServiceKind,
	}
	cfg, err := i.monitorConfigModule.GetMonitorConfig(ctx)
	if err != nil {
		return nil, err
	}
	if len(cfg.Config) < 1 {
		return result, nil
	}

	o, err := i.monitorModule.AIChartOverview(ctx, serviceId, s, e)
	if err != nil {
		return nil, err
	}

	result.AvailableMonitor = true
	result.ChartAIOverview = o
	return result, nil
}

func (i *imlServiceController) RestChartOverview(ctx *gin.Context, serviceId string, start string, end string) (*monitor_dto.ServiceChartRestOverview, error) {
	s, e, err := formatTime(start, end)
	if err != nil {
		return nil, err
	}
	if serviceId == "" {
		return nil, fmt.Errorf("service is required")
	}
	so, err := i.module.ServiceOverview(ctx, serviceId)
	if err != nil {
		return nil, err
	}
	result := &monitor_dto.ServiceChartRestOverview{
		EnableMCP:     so.EnableMCP,
		SubscriberNum: so.SubscriberNum,
		APINum:        so.APINum,
		ServiceKind:   so.ServiceKind,
	}
	cfg, err := i.monitorConfigModule.GetMonitorConfig(ctx)
	if err != nil {
		return nil, err
	}
	if len(cfg.Config) < 1 {
		return result, nil
	}
	o, err := i.monitorModule.RestChartOverview(ctx, serviceId, s, e)
	if err != nil {
		return nil, err
	}
	result.AvailableMonitor = true
	result.ChartRestOverview = o
	return result, nil
}

func formatTime(start string, end string) (int64, int64, error) {
	s, err := strconv.ParseInt(start, 10, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("parse start time %s error: %w", start, err)
	}
	e, err := strconv.ParseInt(end, 10, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("parse end time %s error: %w", end, err)
	}
	return s, e, nil
}

func (i *imlServiceController) Top10(ctx *gin.Context, serviceId string, start string, end string) ([]*monitor_dto.TopN, []*monitor_dto.TopN, error) {
	if serviceId == "" {
		return nil, nil, fmt.Errorf("serviceId is required")
	}
	info, err := i.module.Get(ctx, serviceId)
	if err != nil {
		return nil, nil, err
	}

	s, e, err := formatTime(start, end)
	if err != nil {
		return nil, nil, err
	}

	return i.monitorModule.Top(ctx, serviceId, s, e, 10, info.ServiceKind)
}

func (i *imlServiceController) QuickCreateAIService(ctx *gin.Context, input *service_dto.QuickCreateAIService) error {
	return i.transaction.Transaction(ctx, func(txCtx context.Context) error {
		enable := true
		err := i.providerModule.UpdateProviderConfig(ctx, input.Provider, &ai_dto.UpdateConfig{
			Config: input.Config,
			Enable: &enable,
		})
		if err != nil {
			return err
		}
		p, err := i.providerModule.Provider(ctx, input.Provider)
		if err != nil {
			return err
		}
		id := uuid.NewString()
		prefix := fmt.Sprintf("/%s", id[:8])
		catalogueInfo, err := i.catalogueModule.DefaultCatalogue(ctx)
		if err != nil {
			return err
		}
		_, err = i.createAIService(ctx, input.Team, &service_dto.CreateService{
			Id:           uuid.NewString(),
			Name:         input.Provider + " AI Service",
			Prefix:       prefix,
			Description:  "Quick create by AI provider",
			ServiceType:  "public",
			State:        "normal",
			Catalogue:    catalogueInfo.Id,
			ApprovalType: "auto",
			Provider:     &input.Provider,
			Model:        &p.DefaultLLM,
			Kind:         "ai",
		})
		return err
	})
}

func (i *imlServiceController) QuickCreateRestfulService(ctx *gin.Context) error {
	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return err
	}
	file, err := fileHeader.Open()
	if err != nil {
		return err
	}
	content, err := io.ReadAll(file)
	if err != nil {
		return err
	}
	typ := ctx.PostForm("type")
	switch typ {
	case "swagger", "":
	default:
		return fmt.Errorf("type %s not support", typ)
	}

	return i.transaction.Transaction(ctx, func(txCtx context.Context) error {
		teamId := ctx.PostForm("team")
		id := uuid.NewString()
		prefix := fmt.Sprintf("/%s", id[:8])
		catalogueInfo, err := i.catalogueModule.DefaultCatalogue(ctx)
		if err != nil {
			return err
		}
		s, err := i.module.Create(ctx, teamId, &service_dto.CreateService{
			Id:           uuid.NewString(),
			Name:         "Restful Service By Swagger",
			Prefix:       prefix,
			Description:  "Auto create by upload swagger",
			ServiceType:  "public",
			State:        "normal",
			Catalogue:    catalogueInfo.Id,
			ApprovalType: "auto",
			Kind:         "rest",
		})
		if err != nil {
			return err
		}
		_, err = i.apiDocModule.UpdateDoc(ctx, s.Id, &api_doc_dto.UpdateDoc{
			Id:      s.Id,
			Content: string(content),
		})
		if err != nil {
			return err
		}
		path := prefix + "/"
		_, err = i.routerModule.Create(ctx, s.Id, &router_dto.Create{
			Id:          uuid.NewString(),
			Name:        "",
			Path:        path + "*",
			Methods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch, http.MethodOptions},
			Description: "auto create by create service",
			Protocols:   []string{"http", "https"},
			Proxy: &router_dto.InputProxy{
				Path:    path,
				Timeout: 30000,
				Retry:   0,
			},
			Disable: false,
		})
		if err != nil {
			return err
		}
		apps, err := i.appModule.Search(ctx, teamId, "")
		if err != nil {
			return err
		}
		for _, app := range apps {
			i.subscribeModule.AddSubscriber(ctx, id, &subscribe_dto.AddSubscriber{
				Application: app.Id,
			})
		}

		return nil
	})
}

var (
	loader = openapi3.NewLoader()
)

func (i *imlServiceController) swagger(ctx *gin.Context, id string) (*openapi3.T, error) {
	doc, err := i.apiDocModule.GetDoc(ctx, id)
	if err != nil {
		return nil, err
	}
	tmp, err := loader.LoadFromData([]byte(doc.Content))
	if err != nil {
		return nil, err
	}
	cfg := i.settingModule.Get(ctx)

	tmp.AddServer(&openapi3.Server{
		URL: cfg.InvokeAddress,
	})
	return tmp, nil
}

func (i *imlServiceController) ExportSwagger(ctx *gin.Context) {
	id, has := ctx.Params.Get("id")
	if !has {
		ctx.JSON(200, &pm3.Response{
			Code:    -1,
			Success: "fail",
			Message: fmt.Sprintf("id is required"),
		})
		return
	}
	s, err := i.module.Get(ctx, id)
	if err != nil {
		ctx.JSON(200, &pm3.Response{
			Code:    -1,
			Success: "fail",
			Message: err.Error(),
		})
		return
	}
	tmp, err := i.swagger(ctx, id)
	if err != nil {
		ctx.JSON(200, &pm3.Response{
			Code:    -1,
			Success: "fail",
			Message: err.Error(),
		})
		return
	}

	data, _ := tmp.MarshalJSON()
	ctx.Status(200)
	// 设置响应头
	ctx.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.json", strings.Replace(s.Name, " ", "_", -1)))
	ctx.Header("Content-Type", "application/octet-stream")
	ctx.Header("Content-Transfer-Encoding", "binary")
	ctx.Writer.Write(data)
	return
}

func (i *imlServiceController) Swagger(ctx *gin.Context) {
	id, has := ctx.Params.Get("id")
	if !has {
		ctx.JSON(200, &pm3.Response{
			Code:    -1,
			Success: "fail",
			Message: fmt.Sprintf("id is required"),
		})
		return
	}
	tmp, err := i.swagger(ctx, id)
	if err != nil {
		ctx.JSON(200, &pm3.Response{
			Code:    -1,
			Success: "fail",
			Message: err.Error(),
		})
		return
	}
	ctx.JSON(200, tmp)
	return
}

func (i *imlServiceController) Simple(ctx *gin.Context) ([]*service_dto.SimpleServiceItem, error) {
	return i.module.Simple(ctx)
}

func (i *imlServiceController) MySimple(ctx *gin.Context) ([]*service_dto.SimpleServiceItem, error) {
	return i.module.MySimple(ctx)
}

func (i *imlServiceController) editAIService(ctx *gin.Context, id string, input *service_dto.EditService) (*service_dto.Service, error) {

	if input.Provider == nil {
		return nil, fmt.Errorf("provider is required")
	}
	if *input.Provider != ai_provider_local.ProviderLocal {
		_, has := model_runtime.GetProvider(*input.Provider)
		if !has {
			return nil, fmt.Errorf("provider not found")
		}
	}

	info, err := i.module.Edit(ctx, id, input)
	if err != nil {
		return nil, err
	}
	//_, err = i.upstreamModule.Save(ctx, id, newAIUpstream(id, *input.Provider, p.URI()))

	return info, nil
}

func (i *imlServiceController) createAIService(ctx *gin.Context, teamID string, input *service_dto.CreateService) (*service_dto.Service, error) {
	if input.Provider == nil {
		return nil, fmt.Errorf("provider is required")
	}

	if input.Id == "" {
		input.Id = uuid.New().String()
	}
	if input.Prefix == "" {
		if len(input.Id) < 9 {
			input.Prefix = input.Id
		} else {
			input.Prefix = input.Id[:8]
		}
	}
	modelId := ""
	modelCfg := ""
	modelType := "online"
	if *input.Provider == ai_provider_local.ProviderLocal {
		modelType = "local"
		list, err := i.aiLocalModel.SimpleList(ctx)
		if err != nil {
			return nil, err
		}
		if len(list) == 0 {
			return nil, fmt.Errorf("no local model")
		}
		modelId = list[0].Id
		modelCfg = ai_provider_local.LocalConfig
	} else {
		pv, err := i.providerModule.Provider(ctx, *input.Provider)
		if err != nil {
			return nil, err
		}
		p, has := model_runtime.GetProvider(*input.Provider)
		if !has {
			return nil, fmt.Errorf("provider not found")
		}
		m, has := p.GetModel(pv.DefaultLLM)
		if !has {
			return nil, fmt.Errorf("model %s not found", pv.DefaultLLM)
		}
		//modelId = m.ID()
		modelId = m.Name()
		modelCfg = m.DefaultConfig()

	}

	var info *service_dto.Service
	err := i.transaction.Transaction(ctx, func(txCtx context.Context) error {
		var err error
		info, err = i.module.Create(ctx, teamID, input)
		if err != nil {
			return err
		}
		prefix := strings.Replace(input.Prefix, ":", "_", -1)
		path := fmt.Sprintf("/%s/chat/completions", strings.Trim(prefix, "/"))
		timeout := 300000
		retry := 0
		aiPrompt := &ai_api_dto.AiPrompt{
			Variables: []*ai_api_dto.AiPromptVariable{},
			Prompt:    "",
		}
		aiModel := &ai_api_dto.AiModel{
			Id:       modelId,
			Config:   modelCfg,
			Provider: *input.Provider,
			Type:     modelType,
		}
		name := "Demo AI API "
		description := "This is a demo that shows you how to use a Chat API."
		apiId := uuid.New().String()
		err = i.aiAPIModule.Create(
			ctx,
			info.Id,
			&ai_api_dto.CreateAPI{
				Id:          apiId,
				Name:        name,
				Path:        path,
				Description: description,
				Disable:     false,
				AiPrompt:    aiPrompt,
				AiModel:     aiModel,
				Timeout:     timeout,
				Retry:       retry,
			},
		)
		if err != nil {
			return err
		}
		plugins := make(map[string]api.PluginSetting)
		plugins["ai_prompt"] = api.PluginSetting{
			Config: plugin_model.ConfigType{
				"prompt":    aiPrompt.Prompt,
				"variables": aiPrompt.Variables,
			},
		}
		plugins["ai_formatter"] = api.PluginSetting{
			Config: plugin_model.ConfigType{
				"model":    aiModel.Id,
				"provider": fmt.Sprintf("%s@ai-provider", info.Provider.Id),
				"config":   aiModel.Config,
			},
		}
		_, err = i.routerModule.Create(ctx, info.Id, &router_dto.Create{
			Id:   apiId,
			Name: name,
			Path: path,
			Methods: []string{
				http.MethodPost,
			},
			Description: description,
			Protocols:   []string{"http", "https"},
			MatchRules:  nil,
			Proxy: &router_dto.InputProxy{
				Path:    path,
				Timeout: timeout,
				Retry:   retry,
				Plugins: plugins,
			},
			Disable:  false,
			Upstream: info.Provider.Id,
		})
		if err != nil {
			return err
		}
		apps, err := i.appModule.Search(ctx, info.Team.Id, "")
		if err != nil {
			return err
		}
		for _, app := range apps {
			i.subscribeModule.AddSubscriber(ctx, info.Id, &subscribe_dto.AddSubscriber{
				Application: app.Id,
			})
		}

		return i.docModule.SaveServiceDoc(ctx, info.Id, &service_dto.SaveServiceDoc{
			Doc: "",
		})
	})

	return info, err
}

func (i *imlServiceController) SearchMyServices(ctx *gin.Context, teamId string, keyword string) ([]*service_dto.ServiceItem, error) {
	return i.module.SearchMyServices(ctx, teamId, keyword)
}

func (i *imlServiceController) Get(ctx *gin.Context, id string) (*service_dto.Service, error) {
	now := time.Now()
	defer func() {
		log.Infof("get service %s cost %d ms", id, time.Since(now).Milliseconds())
	}()
	return i.module.Get(ctx, id)
}

func (i *imlServiceController) Search(ctx *gin.Context, teamIDs string, keyword string) ([]*service_dto.ServiceItem, error) {
	return i.module.Search(ctx, teamIDs, keyword)
}

func (i *imlServiceController) Create(ctx *gin.Context, teamID string, input *service_dto.CreateService) (*service_dto.Service, error) {
	if input.Kind == "ai" {
		return i.createAIService(ctx, teamID, input)
	}
	var err error
	var info *service_dto.Service
	err = i.transaction.Transaction(ctx, func(ctx context.Context) error {
		info, err = i.module.Create(ctx, teamID, input)
		if err != nil {
			return err
		}
		path := fmt.Sprintf("/%s/", strings.Trim(input.Prefix, "/"))
		_, err = i.routerModule.Create(ctx, info.Id, &router_dto.Create{
			Id:          uuid.New().String(),
			Name:        "",
			Path:        path + "*",
			Methods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch, http.MethodOptions},
			Description: "auto create by create service",
			Protocols:   []string{"http", "https"},
			MatchRules:  nil,
			Upstream:    "",
			Proxy: &router_dto.InputProxy{
				Path:    path,
				Timeout: 30000,
				Retry:   0,
			},
			Disable: false,
		})
		apps, err := i.appModule.Search(ctx, teamID, "")
		if err != nil {
			return err
		}
		for _, app := range apps {
			i.subscribeModule.AddSubscriber(ctx, info.Id, &subscribe_dto.AddSubscriber{
				Application: app.Id,
			})
		}
		return err
	})
	return info, err
}

func (i *imlServiceController) Edit(ctx *gin.Context, id string, input *service_dto.EditService) (*service_dto.Service, error) {
	info, err := i.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if info.ServiceKind == "ai" {
		return i.editAIService(ctx, id, input)
	}
	return i.module.Edit(ctx, id, input)
}

func (i *imlServiceController) Delete(ctx *gin.Context, id string) error {
	return i.module.Delete(ctx, id)
}

func (i *imlServiceController) ServiceDoc(ctx *gin.Context, id string) (*service_dto.ServiceDoc, error) {
	return i.docModule.ServiceDoc(ctx, id)
}

func (i *imlServiceController) SaveServiceDoc(ctx *gin.Context, id string, input *service_dto.SaveServiceDoc) error {
	return i.docModule.SaveServiceDoc(ctx, id, input)
}

type imlAppController struct {
	module     service.IAppModule                             `autowired:""`
	authModule application_authorization.IAuthorizationModule `autowired:""`
}

func (i *imlAppController) SearchCanSubscribe(ctx *gin.Context, serviceId string) ([]*service_dto.SubscribeAppItem, error) {
	items, _, err := i.module.SearchCanSubscribe(ctx, serviceId)
	return items, err
}

func (i *imlAppController) Search(ctx *gin.Context, teamId string, keyword string) ([]*service_dto.AppItem, error) {
	return i.module.Search(ctx, teamId, keyword)
}

func (i *imlAppController) CreateApp(ctx *gin.Context, teamID string, input *service_dto.CreateApp) (*service_dto.App, error) {
	app, err := i.module.CreateApp(ctx, teamID, input)
	if err != nil {
		return nil, err
	}
	_, err = i.authModule.AddAuthorization(ctx, app.Id, &application_authorization_dto.CreateAuthorization{
		Name:       "Default API Key",
		Driver:     "apikey",
		Position:   "Header",
		TokenName:  "Authorization",
		ExpireTime: 0,
		Config: map[string]interface{}{
			"apikey": uuid.New().String(),
		},
	})
	if err != nil {
		i.module.DeleteApp(ctx, app.Id)
		return nil, err
	}
	return app, nil
}
func (i *imlAppController) UpdateApp(ctx *gin.Context, appId string, input *service_dto.UpdateApp) (*service_dto.App, error) {
	return i.module.UpdateApp(ctx, appId, input)
}

func (i *imlAppController) SearchMyApps(ctx *gin.Context, teamId string, keyword string) ([]*service_dto.AppItem, error) {
	return i.module.SearchMyApps(ctx, teamId, keyword)
}

func (i *imlAppController) SimpleApps(ctx *gin.Context, keyword string) ([]*service_dto.SimpleAppItem, error) {
	return i.module.SimpleApps(ctx, keyword)
}

func (i *imlAppController) MySimpleApps(ctx *gin.Context, keyword string) ([]*service_dto.SimpleAppItem, error) {
	return i.module.MySimpleApps(ctx, keyword)
}

func (i *imlAppController) GetApp(ctx *gin.Context, appId string) (*service_dto.App, error) {
	return i.module.GetApp(ctx, appId)
}

func (i *imlAppController) DeleteApp(ctx *gin.Context, appId string) error {
	return i.module.DeleteApp(ctx, appId)
}

//func newAIUpstream(id string, provider string, uri model_runtime.IProviderURI) *upstream_dto.Upstream {
//	return &upstream_dto.Upstream{
//		Type:            "http",
//		Balance:         "round-robin",
//		Timeout:         300000,
//		Retry:           0,
//		Remark:          fmt.Sprintf("auto create by ai service %s,provider is %s", id, provider),
//		LimitPeerSecond: 0,
//		ProxyHeaders:    nil,
//		Scheme:          uri.Scheme(),
//		PassHost:        "node",
//		Nodes: []*upstream_dto.NodeConfig{
//			{
//				Address: uri.Host(),
//				Weight:  100,
//			},
//		},
//	}
//}
