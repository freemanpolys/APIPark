import { ArrowLeftOutlined } from '@ant-design/icons'
import WithPermission from '@common/components/aoplatform/WithPermission'
import { $t } from '@common/locales'
import { Button, Tag } from 'antd'
import { FC, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBreadcrumb from './Breadcrumb'

class InsidePageProps {
  showBanner?: boolean = true
  pageTitle: string | React.ReactNode = ''
  tagList?: Array<{ label: string | ReactNode; className?: string; color?: string }> = []
  children: React.ReactNode
  showBtn?: boolean = false
  btnTitle?: string = ''
  description?: string | React.ReactNode = ''
  onBtnClick?: () => void
  backUrl?: string = '/'
  btnAccess?: string
  showBorder?: boolean = true
  className?: string = ''
  contentClassName?: string = ''
  headerClassName?: string = ''
  /** 整个页面滚动 */
  scrollPage?: boolean = true
  scrollInsidePage?: boolean = false
  customPadding?: boolean
  customBtn?: ReactNode
  customBanner?: ReactNode
}

const InsidePage: FC<InsidePageProps> = ({
  showBanner = true,
  pageTitle,
  tagList,
  showBtn,
  btnTitle,
  btnAccess,
  description,
  children,
  onBtnClick,
  backUrl,
  showBorder = true,
  className = '',
  contentClassName = '',
  headerClassName = '',
  scrollPage = true,
  scrollInsidePage = false,
  customPadding = false,
  customBtn,
  customBanner
}) => {
  const navigate = useNavigate()

  const goBack = () => {
    navigate(backUrl || '/')
  }
  return (
    <div
      className={`flex flex-col flex-1 h-full ${scrollInsidePage ? 'overflow-auto' : 'overflow-hidden'} ${className}`}
    >
      {showBanner && (
        <div
          className={`border-[0px] mr-PAGE_INSIDE_X ${showBorder ? 'border-solid border-b-[1px] border-BORDER' : ''} ${headerClassName}`}
        >
          {!pageTitle && !description && !backUrl && !customBtn && !customBanner ? (
            <></>
          ) : customBanner ? (
            <div className={customPadding ? '' : 'mb-[15px]'}>
              {backUrl && <TopBreadcrumb handleBackCallback={() => goBack()} />}
              {customBanner}
            </div>
          ) : (
            <div className={customPadding ? '' : 'mb-[30px]'}>
              {backUrl && <TopBreadcrumb handleBackCallback={() => goBack()} />}
              <div className="flex justify-between mb-[20px] items-center ">
                <div className="flex items-center gap-TAG_LEFT">
                  <div className="text-theme text-[26px] ">{pageTitle}</div>
                  {tagList &&
                    tagList?.length > 0 &&
                    tagList?.map((tag) => {
                      return (
                        <Tag key={tag.label as string} bordered={false} color={tag.color} className={tag.className}>
                          {tag.label}
                        </Tag>
                      )
                    })}
                </div>
                {showBtn && (
                  <WithPermission access={btnAccess}>
                    <Button
                      type="primary"
                      onClick={() => {
                        onBtnClick && onBtnClick()
                      }}
                    >
                      {btnTitle}
                    </Button>
                  </WithPermission>
                )}
                {customBtn}
              </div>
              <div>{description}</div>
            </div>
          )}
        </div>
      )}
      <div
        className={`h-full  ${scrollInsidePage ? 'overflow-visible' : scrollPage ? 'overflow-hidden' : 'overflow-auto'} ${contentClassName || ''}`}
      >
        {children}
      </div>
    </div>
  )
}

export default InsidePage
