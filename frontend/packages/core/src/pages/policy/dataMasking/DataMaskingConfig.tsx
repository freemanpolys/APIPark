import { LoadingOutlined } from "@ant-design/icons"
import InsidePage from "@common/components/aoplatform/InsidePage"
import WithPermission from "@common/components/aoplatform/WithPermission"
import { BasicResponse, STATUS_CODE, RESPONSE_TIPS, PLACEHOLDER } from "@common/const/const"
import { RouterParams } from "@common/const/type"
import { useGlobalContext } from "@common/contexts/GlobalStateContext"
import { useFetch } from "@common/hooks/http"
import { $t } from "@common/locales"
import { App, Button, Form, Input, InputNumber, Row, Select, Spin } from "antd"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import DataMaskRuleTable from "./DataMaskingRuleTable"
import FilterTable from "../FilterTable"
import { DataMaskingConfigHandle ,DataMaskingConfigFieldType, PolicyMatchType} from "@common/const/policy/type"
import {PolicyOptions} from '@common/const/policy/consts'
import {v4 as uuidv4} from 'uuid'
import { useBreadcrumb } from "@common/contexts/BreadcrumbContext"

const DataMaskingConfig = forwardRef<DataMaskingConfigHandle>((_,ref) => {
    const { message,modal } = App.useApp()
    const { teamId, serviceId, policyId } = useParams<RouterParams>();
    const [onEdit, setOnEdit] = useState<boolean>(!!teamId)
    const [form] = Form.useForm();
    const {fetchData} = useFetch()
    const { state } = useGlobalContext()
    const [ loading, setLoading ] = useState<boolean>(false)
    const navigator = useNavigate()
    const { setBreadcrumb } = useBreadcrumb()

    useImperativeHandle(ref, () => ({
        save:onFinish
    }));

    // 获取表单默认值
    const getPolicyInfo = () => {
        setLoading(true)
        fetchData<BasicResponse<{ strategy: DataMaskingConfigFieldType }>>( `strategy/${serviceId === undefined? 'global':'service'}/data-masking`,{method:'GET',eoParams:{team:teamId, service:serviceId, strategy:policyId}}).then(response=>{
            const {code,data,msg} = response
            if(code === STATUS_CODE.SUCCESS){
                setTimeout(()=>{
                    form.setFieldsValue({
                        ...data.strategy,
                        type:'data-masking',
                        filters:data.strategy.filters?.map((x)=>{x._eoKey = uuidv4(); return x})
                    })
                },0)
            }else{
                message.error(msg || $t(RESPONSE_TIPS.error))
            }
        }).finally(()=>setLoading(false))
    };

    const onFinish:()=>Promise<boolean|string> = () => {
        return form.validateFields().then((value)=>{
            if(value.filters){
                value.filters = value.filters.map((x:PolicyMatchType)=>({
                    ...x, 
                    values:x.name === 'ip' ? x.values?.[0].split('\n'): (x.values.indexOf('ALL')!== -1 ? ['ALL']:x.values)}))
            }
            return fetchData<BasicResponse<{service:{id:string}}>>(
                `strategy/${serviceId === undefined? 'global':'service'}/data-masking`,
                {
                    method:policyId === undefined? 'POST' : 'PUT',
                    eoParams: {service:serviceId,team:teamId, strategy:policyId},
                    eoBody:({...value})
                }).then(response=>{
                    const {code,data,msg} = response
                    if(code === STATUS_CODE.SUCCESS){
                        message.success(msg || $t(RESPONSE_TIPS.success))
                        navigator('../list')
                        return Promise.resolve(true)
                    }else{
                        message.error(msg || $t(RESPONSE_TIPS.error))
                        return Promise.reject(msg || $t(RESPONSE_TIPS.error))
                    }
                }).catch((errorInfo)=>{
                    return Promise.reject(errorInfo)
                })
        })
    };

    useEffect(() => {
        if (policyId !== undefined) {
            setOnEdit(true);
            getPolicyInfo();
        } else {
            setOnEdit(false);
            form.setFieldValue('type','data-masking') 
        }
        return (form.setFieldsValue({}))
    }, [policyId]);

    const policyOptions = useMemo(()=>PolicyOptions.map((x)=>({...x, label:$t(x.label)})),[state.language])

    return (
       
        <InsidePage pageTitle={serviceId ? undefined: $t('编辑策略')} 
            showBorder={false}
            scrollPage={false}
            className="overflow-y-auto"
            backUrl={serviceId ? `/service/${teamId}/aiInside/${serviceId}/servicepolicy` : undefined}
            >
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} spinning={loading} wrapperClassName=' pb-PAGE_INSIDE_B pr-PAGE_INSIDE_X'>
                <WithPermission access={onEdit ? [`${ serviceId === undefined ? 'system.devops':'team.service'}.policy.edit`] :''}>
                    <Form
                        layout='vertical'
                        labelAlign='left'
                        scrollToFirstError
                        form={form}
                        className="w-full "
                        name="systemConfig"
                        onFinish={onFinish}
                        autoComplete="off"
                    >
                        <div>
                            <Form.Item<DataMaskingConfigFieldType>
                                label={$t("策略名称")}
                                name="name"
                                rules={[{ required: true ,whitespace:true }]}
                            >
                                <Input className="w-INPUT_NORMAL" placeholder={$t(PLACEHOLDER.input)}/>
                            </Form.Item>

                             <Form.Item<DataMaskingConfigFieldType>
                                label={$t("策略类型")}
                                name="type"
                                rules={[{ required: true }]}
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    className="w-INPUT_NORMAL"
                                    placeholder={$t(PLACEHOLDER.input)}
                                    options={policyOptions}
                                ></Select>
                            </Form.Item>

                            <Form.Item<DataMaskingConfigFieldType>
                                label={$t("优先级")}
                                name={'priority'}
                                rules={[{required: true}]}
                            >
                                <InputNumber className="w-INPUT_NORMAL" min={1} placeholder={$t(PLACEHOLDER.input)} />
                            </Form.Item>

                            <Form.Item<DataMaskingConfigFieldType>
                                label={$t("描述")}
                                name="description"
                            >
                                <Input.TextArea className="w-INPUT_NORMAL" placeholder={$t(PLACEHOLDER.input)}/>
                            </Form.Item>

                            <Form.Item<DataMaskingConfigFieldType>
                                label={$t("匹配条件")}
                                name="filters"
                            >
                                <FilterTable />
                            </Form.Item>

                            <Form.Item<DataMaskingConfigFieldType>
                                label={$t("数据脱敏规则")}
                                name={["config","rules"]}
                                rules={[{required: true}]}
                            >
                                <DataMaskRuleTable />
                            </Form.Item>

                            <Row className="mb-[10px]">
                                <WithPermission access={onEdit ? [`${ serviceId === undefined ? 'system.devops':'team.service'}.policy.edit`] :''}>
                                    <Button type="primary" htmlType="submit">
                                        {$t('保存')}
                                    </Button>
                                </WithPermission>
                                <Button className="ml-btnrbase" type="default" onClick={() =>  navigator('../list')}>
                                        {$t('取消')}
                                </Button>
                            </Row>
                        </div>
                    </Form>
                </WithPermission>
            </Spin>
        </InsidePage>
    )
})
export default DataMaskingConfig