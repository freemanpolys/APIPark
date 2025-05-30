package log_driver

import (
	"time"
)

type LogItem struct {
	ID            string
	Strategy      string
	Service       string
	API           string
	Method        string
	Url           string
	RemoteIP      string
	Consumer      string
	Authorization string
	InputToken    int64
	OutputToken   int64
	TotalToken    int64
	AIProvider    string
	AIModel       string
	StatusCode    int64
	ResponseTime  int64
	Traffic       int64
	RecordTime    time.Time
}

type LogInfo struct {
	*LogItem
	ContentType       string
	RequestBody       string
	ProxyBody         string
	ProxyResponseBody string
	ResponseBody      string
	RequestHeader     string
	ResponseHeader    string
}
