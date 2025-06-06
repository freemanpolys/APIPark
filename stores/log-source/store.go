package log_source

import (
	"reflect"

	"github.com/eolinker/go-common/autowire"
	"github.com/eolinker/go-common/store"
)

type ILogSourceStore interface {
	store.IBaseStore[LogSource]
}

type storeLogSource struct {
	store.Store[LogSource]
}

type ILogRecordStore interface {
	store.IBaseStore[LogRecord]
}

type storeLogRecord struct {
	store.Store[LogRecord]
}

func init() {
	autowire.Auto[ILogSourceStore](func() reflect.Value {
		return reflect.ValueOf(new(storeLogSource))
	})
	autowire.Auto[ILogRecordStore](func() reflect.Value {
		return reflect.ValueOf(new(storeLogRecord))
	})
}
