import { Card, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { $t } from '@common/locales/index.ts'
import Indicator from './indicator/Indicator'
import { LoadingOutlined } from '@ant-design/icons'
import DateSelectFilter, { TimeOption } from './filter/DateSelectFilter'
import { TimeRange } from '@common/components/aoplatform/TimeRangeSelector'
import ServiceBarChar, { BarChartInfo } from './charts/ServiceBarChar'
import { useFetch } from '@common/hooks/http'
import { BasicResponse, RESPONSE_TIPS, STATUS_CODE } from '@common/const/const'
import { App } from 'antd'
import ServiceAreaChart from './charts/ServiceAreaChart'
import RankingList from './rankingList/RankingList'
import { abbreviateFloat, formatBytes, formatDuration, formatNumberWithUnit, getTime } from '@dashboard/utils/dashboard'
import { setBarChartInfoData } from './utils'
import { useGlobalContext } from '@common/contexts/GlobalStateContext'

const ServiceOverview = ({ serviceType }: { serviceType: 'aiService' | 'restService' }) => {
  /** 路由参数 */
  const { serviceId, teamId } = useParams<{ serviceId: string; teamId: string }>()
  /** 面板 loading */
  const [dashboardLoading, setDashboardLoading] = useState(true)
  /** 默认时间 */
  const [defaultTime] = useState<TimeOption>('day')
  /** 当前选中的时间范围 */
  const [timeRange, setTimeRange] = useState<TimeRange | undefined>()
  /** 总数数据 */
  const [barChartInfo, setBarChartInfo] = useState<any>()
  /** 平均值数据 */
  const [perBarChartInfo, setPerBarChartInfo] = useState<any>()
  /** 指标数据 */
  const [indicatorInfo, setIndicatorInfo] = useState<any>([])
  /** 排名表格数据 */
  const [topRankingList, setTopRankingList] = useState<any>([])
  /** 获取服务信息 */
  const { fetchData } = useFetch()
  /** 弹窗组件 */
  const { message } = App.useApp()
  /** 全局状态 */
  const { state } = useGlobalContext()
  /** AI 服务数据 */
  const [aiServiceOverview, setAiServiceOverview] = useState<any>()
  /** REST 服务数据 */
  const [restServiceOverview, setRestServiceOverview] = useState<any>()
  /** 时间选择回调 */
  const selectCallback = (date: TimeRange) => {
    setTimeRange(date)
  }

  /** 获取 AI 服务信息 */
  const getAIServiceOverview = () => {
    fetchData<BasicResponse<{ overview: any }>>('service/overview/monitor/ai', {
      method: 'GET',
      eoParams: { service: serviceId, team: teamId, start: timeRange?.start, end: timeRange?.end },
      eoTransformKeys: [
        'enable_mcp',
        'subscriber_num',
        'api_num',
        'service_kind',
        'avaliable_monitor',
        'request_overview',
        'token_overview',
        'avg_token_overview',
        'avg_request_per_subscriber_overview',
        'avg_token_per_subscriber_overview',
        'request_total',
        'token_total',
        'avg_token',
        'max_token',
        'min_token',
        'avg_request_per_subscriber',
        'avg_token_per_subscriber',
        'input_token',
        'output_token',
        'total_token',
        'request_2xx_total',
        'request_4xx_total',
        'request_5xx_total',
        'input_token_total',
        'output_token_total',
        'max_token_per_subscriber',
        'min_token_per_subscriber',
        'max_request_per_subscriber',
        'min_request_per_subscriber'
      ]
    }).then((response) => {
      const { code, data, msg } = response
      if (code === STATUS_CODE.SUCCESS) {
        // 存储 AI 服务数据
        setAiServiceOverview(data.overview)
        // 设置 AI 报表数据
        setAiChartInfoData(data.overview)
      } else {
        message.error(msg || $t(RESPONSE_TIPS.error))
      }
      setDashboardLoading(false)
    })
  }

  /**
   * 设置 REST 服务数据
   * */
  const setRestChartInfoData = (serviceOverview: any) => {
    // 设置指标数据
    setIndicatorInfo({
      apiNum: serviceOverview.apiNum,
      subscriberNum: serviceOverview.subscriberNum,
      teamId: teamId,
      enableMcp: serviceOverview.enableMcp,
      serviceKind: serviceOverview.serviceKind,
      serviceId: serviceId
    })
    // 设置总数数据
    setBarChartInfo([
      // 服务请求次数
      {
        ...setBarChartInfoData({
          title: $t('请求次数'),
          data: serviceOverview.requestOverview,
          value: formatNumberWithUnit(serviceOverview.requestTotal),
          date: serviceOverview.date
        }),
        request2xxTotal: formatNumberWithUnit(serviceOverview.request2xxTotal),
        request4xxTotal: formatNumberWithUnit(serviceOverview.request4xxTotal),
        request5xxTotal: formatNumberWithUnit(serviceOverview.request5xxTotal)
      },
      // 流量消耗总数
      {
        ...setBarChartInfoData({
          title: $t('网络流量'),
          data: serviceOverview.trafficOverview,
          value: formatBytes(serviceOverview.trafficTotal),
          date: serviceOverview.date
        }),
        traffic2xxTotal: formatBytes(serviceOverview.traffic2xxTotal),
        traffic4xxTotal: formatBytes(serviceOverview.traffic4xxTotal),
        traffic5xxTotal: formatBytes(serviceOverview.traffic5xxTotal)
      }
    ])
    // 设置平均值数据
    setPerBarChartInfo([
      // 各个模型使用量
      {
        title: $t('平均响应时间'),
        data: serviceOverview.avgResponseTimeOverview,
        value: formatDuration(serviceOverview.avgResponseTime),
        originValue: serviceOverview.avgResponseTime,
        date: serviceOverview.date,
        max: formatDuration(serviceOverview.maxResponseTime),
        min: formatDuration(serviceOverview.minResponseTime),
        type: 'area',
        showXAxis: false
      },
      // 平均请求
      {
        ...setBarChartInfoData({
          title: $t('平均每消费者的请求次数'),
          data: serviceOverview.avgRequestPerSubscriberOverview,
          date: serviceOverview.date,
          showXAxis: false
        }),
        max: abbreviateFloat(serviceOverview.maxRequestPerSubscriber),
        min: abbreviateFloat(serviceOverview.minRequestPerSubscriber)
      },
      // 平均流量消耗
      {
        ...setBarChartInfoData({
          title: $t('平均每消费者的网络流量'),
          data: serviceOverview.avgTrafficPerSubscriberOverview,
          date: serviceOverview.date,
          showXAxis: false
        }),
        max: formatBytes(serviceOverview.maxTrafficPerSubscriber),
        min: formatBytes(serviceOverview.minTrafficPerSubscriber)
      }
    ])
  }

  /**
   * 设置 AI 服务数据
   * */
  const setAiChartInfoData = (serviceOverview: any) => {
    // 设置指标数据
    setIndicatorInfo({
      apiNum: serviceOverview.apiNum,
      subscriberNum: serviceOverview.subscriberNum,
      teamId: teamId,
      enableMcp: serviceOverview.enableMcp,
      serviceKind: serviceOverview.serviceKind,
      serviceId: serviceId
    })
    // 设置总数数据
    setBarChartInfo([
      // 服务请求次数
      {
        ...setBarChartInfoData({
          title: $t('请求次数'),
          data: serviceOverview.requestOverview,
          value: formatNumberWithUnit(serviceOverview.requestTotal),
          date: serviceOverview.date
        }),
        request2xxTotal: formatNumberWithUnit(serviceOverview.request2xxTotal),
        request4xxTotal: formatNumberWithUnit(serviceOverview.request4xxTotal),
        request5xxTotal: formatNumberWithUnit(serviceOverview.request5xxTotal)
      },
      // token 消耗总数
      {
        ...setBarChartInfoData({
          title: $t('Token 消耗'),
          data: serviceOverview.tokenOverview.map((item: { inputToken: number; outputToken: number }) => ({
            inputToken: item.inputToken,
            outputToken: item.outputToken
          })),
          value: formatNumberWithUnit(serviceOverview.tokenTotal),
          date: serviceOverview.date
        }),
        inputTokenTotal: formatNumberWithUnit(serviceOverview.inputTokenTotal),
        outputTokenTotal: formatNumberWithUnit(serviceOverview.outputTokenTotal)
      }
    ])
    // 设置平均值数据
    setPerBarChartInfo([
      // 平均 token 消耗
      {
        title: $t('平均 Token 消耗'),
        data: serviceOverview.avgTokenOverview,
        value: formatNumberWithUnit(serviceOverview.avgToken) + ' Token/s',
        originValue: serviceOverview.avgToken,
        date: serviceOverview.date,
        min: formatNumberWithUnit(serviceOverview.minToken) + ' Token/s',
        max: formatNumberWithUnit(serviceOverview.maxToken) + ' Token/s',
        type: 'area'
      },
      {
        // 平均请求
        ...setBarChartInfoData({
          title: $t('平均每消费者的请求次数'),
          data: serviceOverview.avgRequestPerSubscriberOverview,
          date: serviceOverview.date
        }),
        max: abbreviateFloat(serviceOverview.maxRequestPerSubscriber),
        min: abbreviateFloat(serviceOverview.minRequestPerSubscriber)
      },
      // 评价 token 消耗
      {
        ...setBarChartInfoData({
          title: $t('平均每消费者的 Token 消耗'),
          data: serviceOverview.avgTokenPerSubscriberOverview.map(
            (item: { inputToken: number; outputToken: number }) => ({
              inputToken: item.inputToken,
              outputToken: item.outputToken
            })
          ),
          date: serviceOverview.date
        }),
        max: abbreviateFloat(serviceOverview.maxTokenPerSubscriber),
        min: abbreviateFloat(serviceOverview.minTokenPerSubscriber)
      }
    ])
  }

  /** 获取 REST 服务信息 */
  const getRestServiceOverview = () => {
    fetchData<BasicResponse<{ overview: any }>>('service/overview/monitor/rest', {
      method: 'GET',
      eoParams: { service: serviceId, team: teamId, start: timeRange?.start, end: timeRange?.end },
      eoTransformKeys: [
        'enable_mcp',
        'subscriber_num',
        'api_num',
        'service_kind',
        'avaliable_monitor',
        'request_overview',
        'traffic_overview',
        'avg_request_per_subscriber_overview',
        'avg_response_time_overview',
        'avg_traffic_per_subscriber_overview',
        'request_total',
        'traffic_total',
        'max_response_time',
        'min_response_time',
        'avg_response_time',
        'avg_request_per_subscriber',
        'avg_traffic_per_subscriber',
        'request_2xx_total',
        'request_4xx_total',
        'request_5xx_total',
        'traffic_2xx_total',
        'traffic_4xx_total',
        'traffic_5xx_total',
        'max_request_per_subscriber',
        'min_request_per_subscriber',
        'max_traffic_per_subscriber',
        'min_traffic_per_subscriber'
      ]
    }).then((response) => {
      const { code, data, msg } = response
      if (code === STATUS_CODE.SUCCESS) {
        // 存储 REST 服务数据
        setRestServiceOverview(data.overview)
        // 设置 REST 报表数据
        setRestChartInfoData(data.overview)
      } else {
        message.error(msg || $t(RESPONSE_TIPS.error))
      }
      setDashboardLoading(false)
    })
  }

  /** 获取排名列表 */
  const getTopRankingList = () => {
    fetchData<BasicResponse<{ overview: any }>>('service/monitor/top10', {
      method: 'GET',
      eoParams: { service: serviceId, team: teamId, start: timeRange?.start, end: timeRange?.end }
    }).then((response) => {
      const { code, data, msg } = response
      if (code === STATUS_CODE.SUCCESS) {
        // 设置排名表格数据
        setTopRankingList({
          'TOP API': data.apis,
          'TOP Consumer': data.consumers
        })
      } else {
        message.error(msg || $t(RESPONSE_TIPS.error))
      }
      setDashboardLoading(false)
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
      serviceType === 'aiService' ? getAIServiceOverview() : getRestServiceOverview()
      getTopRankingList()
    }
  }, [timeRange])

  useEffect(() => {
    if (serviceType === 'aiService') {
      aiServiceOverview && setAiChartInfoData(aiServiceOverview)
    } else {
      restServiceOverview && setRestChartInfoData(restServiceOverview)
    }
  }, [state.language])

  return (
    <Spin
      className="h-full pb-[20px]"
      wrapperClassName="h-full min-h-[150px]"
      indicator={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: 'scale(1.5)' }}>
            <LoadingOutlined style={{ fontSize: 30 }} spin />
          </div>
        </div>
      }
      spinning={dashboardLoading}
    >
      <div className="mr-[30px]">
        <Indicator indicatorInfo={indicatorInfo} />
        <div className="mt-[20px]">
          <DateSelectFilter selectCallback={selectCallback} defaultTime={defaultTime} />
        </div>
        <div className="mt-[20px] flex mb-[10px]">
          {barChartInfo?.map((item: BarChartInfo, index: number) => (
            <Card
              key={index}
              className={`flex-1 min-w-[430px] rounded-[10px] ${index > 0 ? 'ml-[10px]' : ''}`}
              classNames={{
                body: 'py-[15px] px-[0px]'
              }}
            >
              <ServiceBarChar
                showLegendIndicator={true}
                key={index}
                height={400}
                dataInfo={item}
                customClassNames="flex-1"
              ></ServiceBarChar>
            </Card>
          ))}
        </div>
        <div className="flex mb-[10px]">
          {perBarChartInfo?.map((item: any, index: number) => (
            <Card
              key={index}
              className={`flex-1 rounded-[10px] min-w-[284px] ${index > 0 ? 'ml-[10px]' : ''}`}
              classNames={{
                body: 'py-[15px] px-[0px]'
              }}
            >
              {item.type === 'area' ? (
                <>
                  <ServiceAreaChart
                    key={index}
                    height={270}
                    dataInfo={item}
                    showAvgLine={true}
                    customClassNames="flex-1 relative"
                  ></ServiceAreaChart>
                </>
              ) : (
                <ServiceBarChar
                  key={index}
                  height={270}
                  dataInfo={item}
                  hideIndicatorValue={true}
                  customClassNames="flex-1"
                ></ServiceBarChar>
              )}
            </Card>
          ))}
        </div>
        <RankingList topRankingList={topRankingList} serviceType={serviceType} />
      </div>
    </Spin>
  )
}

export default ServiceOverview
