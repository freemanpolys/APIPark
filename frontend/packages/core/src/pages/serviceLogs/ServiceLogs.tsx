import { LoadingOutlined } from '@ant-design/icons'
import { Drawer, Spin, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import DateSelectFilter, { TimeOption } from '../serviceOverview/filter/DateSelectFilter'
import { TimeRange } from '@common/components/aoplatform/TimeRangeSelector'
import PageList from '@common/components/aoplatform/PageList'
import { useGlobalContext } from '@common/contexts/GlobalStateContext'
import { REST_SERVICE_LOG_LIST, AI_SERVICE_LOG_LIST } from '@core/const/system/const'
import { $t } from '@common/locales/index.ts'
import { BasicResponse, RESPONSE_TIPS, STATUS_CODE } from '@common/const/const'
import { useFetch } from '@common/hooks/http'
import LogDetail, { HttpStatusColor } from './LogDetail'
import { useParams } from 'react-router-dom'
import { ActionType, ParamsType } from '@ant-design/pro-components'
import { getTime } from '@dashboard/utils/dashboard'

export type LogItem = {
  id: string
  api: {
    id: string
    name: string
  }
  status: number
  logTime: string
  responseTime: string
  token?: number
  model?: string
  tokenPerSecond?: string
  traffic?: string
  consumers?: {
    id: string
    name: string
  }
  provider?: {
    id: string
    name: string
  }
}

const ServiceLogs = ({ serviceType }: { serviceType: 'aiService' | 'restService' }) => {
  /** 路由参数 */
  const { serviceId, teamId } = useParams<{ serviceId: string; teamId: string }>()
  /** 面板 loading */
  const [dashboardLoading, setDashboardLoading] = useState(true)
  /** 当前选中的时间范围 */
  const [timeRange, setTimeRange] = useState<TimeRange | undefined>()
  /** 默认时间 */
  const [defaultTime] = useState<TimeOption>('day')
  /** 全局状态 */
  const { state } = useGlobalContext()
  /**
   * 请求数据
   */
  const { fetchData } = useFetch()
  // 打开侧边弹窗
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  /** 选中的行 */
  const [selectedRow, setSelectedRow] = useState<LogItem>()
  /**
   * 列表ref
   */
  const pageListRef = useRef<ActionType>(null)
  /** 列 */
  const columns = useMemo(() => {
    return [...(serviceType === 'aiService' ? AI_SERVICE_LOG_LIST : REST_SERVICE_LOG_LIST)].map((x) => {
      if (x.dataIndex === 'status') {
        x.render = (text: any, record: any) => (
          <>
            <div className="w-full">{renderStatusWithColor(record.status)}</div>
          </>
        )
      }
      return {
        ...x,
        title: typeof x.title === 'string' ? $t(x.title as string) : x.title
      }
    })
  }, [state.language])

  /**
   * 根据状态码返回对应颜色的文本
   * @param status 状态
   * @returns
   */
  const renderStatusWithColor = (status: string | number) => {
    // 获取状态码首位数字
    const firstDigit = status.toString().charAt(0)
    let color = ''
    switch (firstDigit) {
      case '2':
        color = HttpStatusColor.SUCCESS
        break
      case '4':
        color = HttpStatusColor.CLIENT_ERROR
        break
      case '5':
        color = HttpStatusColor.SERVER_ERROR
        break
      default:
        break
    }
    return color ? <span style={{ color }}>{status}</span> : status
  }

  /**
   * 获取 AI 列表数据
   * @param dataType
   * @returns
   */
  const getAiServiceLogList = (
    params: ParamsType & {
      pageSize?: number | undefined
      current?: number | undefined
      keyword?: string | undefined
    }
  ) => {
    return fetchData<BasicResponse<{ log: LogItem[] }>>(`service/logs/ai`, {
      method: 'GET',
      eoParams: {
        service: serviceId,
        team: teamId,
        start: timeRange?.start,
        end: timeRange?.end,
        page: params?.current,
        page_size:params?.pageSize
      },
      eoTransformKeys: ['log_time', 'response_time', 'token_per_second']
    })
      .then((response) => {
        const { code, data, msg } = response
        if (code === STATUS_CODE.SUCCESS) {
          // 保存数据
          return {
            data: data.logs,
            total: data.total,
            success: true
          }
        } else {
          message.error(msg || $t(RESPONSE_TIPS.error))
          return { data: [], success: false }
        }
      })
      .catch(() => {
        return { data: [], success: false }
      })
  }
  /**
   * 获取 REST 列表数据
   * @param dataType
   * @returns
   */
  const getRestServiceLogList = (
    params: ParamsType & {
      pageSize?: number | undefined
      current?: number | undefined
      keyword?: string | undefined
    }
  ) => {
    console.log('params===', params)
    return fetchData<BasicResponse<{ log: LogItem[] }>>(`service/logs/rest`, {
      method: 'GET',
      eoParams: {
        service: serviceId,
        team: teamId,
        start: timeRange?.start,
        end: timeRange?.end,
        page: params?.current,
        page_size:params?.pageSize
      },
      eoTransformKeys: ['log_time', 'response_time', 'token_per_second']
    })
      .then((response) => {
        const { code, data, msg } = response
        if (code === STATUS_CODE.SUCCESS) {
          // 保存数据
          return {
            data: data.logs,
            total: data.total,
            success: true
          }
        } else {
          message.error(msg || $t(RESPONSE_TIPS.error))
          return { data: [], success: false }
        }
      })
      .catch(() => {
        return { data: [], success: false }
      })
  }

  useEffect(() => {
    const { startTime, endTime } = getTime(defaultTime, [])
    setTimeRange({
      start: startTime,
      end: endTime
    })
  }, [])
  useEffect(() => {
    if (timeRange) {
      pageListRef.current?.reload()
    }
  }, [timeRange])

  /** 行点击 */
  const handleRowClick = (record: LogItem) => {
    setSelectedRow(record)
    setDrawerOpen(true)
  }

  /** 时间选择回调 */
  const selectCallback = (date: TimeRange) => {
    setTimeRange(date)
  }

  useEffect(() => {
    setDashboardLoading(false)
  }, [])
  return (
    <Spin
      className="h-full pb-[20px]"
      wrapperClassName="h-full min-h-[150px] overflow-hidden"
      indicator={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: 'scale(1.5)' }}>
            <LoadingOutlined style={{ fontSize: 30 }} spin />
          </div>
        </div>
      }
      spinning={dashboardLoading}
    >
      <div className="h-full mr-PAGE_INSIDE_X">
        <DateSelectFilter selectCallback={selectCallback} customClassNames={'pt-[0px]'} defaultTime={defaultTime} />
        <div style={{ height: 'calc(100% - -3px)' }} className="mt-[20px] overflow-hidden">
          <PageList
            ref={pageListRef}
            id={`${serviceType}_logs`}
            columns={[...columns]}
            request={async (
              params: ParamsType & {
                pageSize?: number | undefined
                current?: number | undefined
                keyword?: string | undefined
              }
            ) => (serviceType === 'aiService' ? getAiServiceLogList(params) : getRestServiceLogList(params))}
            onRowClick={(row: LogItem) => handleRowClick(row)}
          />
        </div>
        <Drawer
          destroyOnClose={true}
          maskClosable={false}
          title={$t('日志详情')}
          width={'40%'}
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
        >
          <LogDetail selectedRow={selectedRow} serviceId={serviceId} teamId={teamId} serviceType={serviceType} />
        </Drawer>
      </div>
    </Spin>
  )
}

export default ServiceLogs
