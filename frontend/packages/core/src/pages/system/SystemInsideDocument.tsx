import WithPermission from '@common/components/aoplatform/WithPermission.tsx'
import { BasicResponse, RESPONSE_TIPS, STATUS_CODE } from '@common/const/const.tsx'
import { EntityItem } from '@common/const/type.ts'
import { useFetch } from '@common/hooks/http.ts'
import { $t } from '@common/locales'
import { RouterParams } from '@core/components/aoplatform/RenderRoutes'
import { Editor } from '@tinymce/tinymce-react'
import { App, Button } from 'antd'
import hljs from 'highlight.js'
import 'highlight.js/styles/default.css'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
const ServiceInsideDocument = () => {
  const { message } = App.useApp()
  const [updater, setUpdater] = useState<string>()
  const [updateTime, setUpdateTime] = useState<string>()
  const [initDoc, setInitDoc] = useState<string>()
  const [doc, setDoc] = useState<string>()
  const { fetchData } = useFetch()
  const { serviceId, teamId } = useParams<RouterParams>()
  const save = () => {
    fetchData<
      BasicResponse<{
        service: { id: string; name: string; updater: string; updateTime: string; doc: string }
      }>
    >('service/doc', {
      method: 'PUT',
      eoBody: { doc: doc },
      eoParams: { service: serviceId, team: teamId },
      eoTransformKeys: ['update_time']
    }).then(response => {
      const { code, msg } = response
      if (code === STATUS_CODE.SUCCESS) {
        message.success(msg || $t(RESPONSE_TIPS.success))
        getServiceDoc()
      } else {
        message.error(msg || $t(RESPONSE_TIPS.error))
      }
    })
  }

  const handleEditorChange = (content: string) => {
    setDoc(content)
  }
  const setupEditor = (editor: unknown) => {
    editor.on('init', () => {
      editor.contentDocument.querySelectorAll('pre code').forEach((block: HTMLElement) => {
        hljs.highlightBlock(block)
      })
    })

    editor.on('SetContent', () => {
      editor.contentDocument.querySelectorAll('pre code').forEach((block: HTMLElement) => {
        hljs.highlightBlock(block)
      })
    })
  }

  const getServiceDoc = () => {
    fetchData<
      BasicResponse<{
        doc: {
          id: string
          name: string
          updater: EntityItem
          updateTime: string
          creater: EntityItem
          doc: string
        }
      }>
    >('service/doc', {
      method: 'GET',
      eoParams: { service: serviceId, team: teamId },
      eoTransformKeys: ['update_time']
    }).then(response => {
      const { code, data, msg } = response
      if (code === STATUS_CODE.SUCCESS) {
        setUpdater(data.doc.updater.id === '' ? '-' : data.doc.updater.name)
        setUpdateTime(data.doc.updater.id === '' ? '-' : data.doc.updateTime)
        setInitDoc(data.doc.doc)
      } else {
        message.error(msg || $t(RESPONSE_TIPS.error))
      }
    })
  }

  useEffect(() => {
    getServiceDoc()
  }, [])

  return (
    <div className="flex flex-col h-full border-[1px] rounded-[10px] border-BORDER border-solid mr-PAGE_INSIDE_X">
      <Editor
        tinymceScriptSrc={'/tinymce/tinymce.min.js'}
        initialValue={initDoc}
        init={{
          height: '100%',
          menubar: false,
          plugins: [
            'advlist',
            'autolink',
            'link',
            'image',
            'lists',
            'charmap',
            'preview',
            'anchor',
            'pagebreak',
            'searchreplace',
            'wordcount',
            'visualblocks',
            'visualchars',
            'codesample',
            'fullscreen',
            'insertdatetime',
            'media',
            'table',
            'emoticons',
            'help'
          ],
          toolbar:
            'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | codesample |table|' +
            'bullist numlist outdent indent | link image | print preview media fullscreen | ' +
            'forecolor backcolor emoticons | help',
          content_style:
            'body{ font-family:Helvetica,Arial,sans-serif; font-size:14px }  img{ max-width: 100%; }',
          setup: setupEditor,
          codesample_languages: [
            {
              text: 'HTML/XML',
              value: 'markup'
            },
            {
              text: 'JavaScript',
              value: 'javascript'
            },
            {
              text: 'CSS',
              value: 'css'
            },
            {
              text: 'PHP',
              value: 'php'
            },
            {
              text: 'Ruby',
              value: 'ruby'
            },
            {
              text: 'GO',
              value: 'go'
            },
            {
              text: 'Python',
              value: 'python'
            },
            {
              text: 'Java',
              value: 'java'
            },
            {
              text: 'C',
              value: 'c'
            },
            {
              text: 'C#',
              value: 'csharp'
            },
            {
              text: 'C++',
              value: 'cpp'
            },
            { text: 'Bash/Shell', value: 'bash' },
            { text: 'SQL', value: 'sql' }
          ]
        }}
        onEditorChange={handleEditorChange}
      />

      <div className=" pl-[8px] py-btnbase ">
        <div className="flex justify-between items-center">
          <p className="text-[14px] leading-[20px] text-[#999999]">
            <span className="mr-[20px]">
              {$t('最近一次更新者')}：{updater || '-'}
            </span>
            <span>
              {$t('最近一次更新时间')}：{updateTime || '-'}
            </span>
          </p>
          <WithPermission access="team.service.service_intro.edit">
            <Button type="primary" className="mr-btnbase" onClick={save}>
              {$t('保存')}
            </Button>
          </WithPermission>
        </div>
      </div>
    </div>
  )
}
export default ServiceInsideDocument
