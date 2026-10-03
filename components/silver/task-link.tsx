'use client';
import {PreviewLinkCard,PreviewLinkCardTrigger,PreviewLinkCardPanel,PreviewLinkCardImage} from '../animate-ui/components/base/preview-link-card';
import {taskPhoto} from '../task-art';
import {localizedTime} from '@/lib/i18n';
export function TaskPreviewLink({task,onOpen}:{task:any,onOpen:()=>void}){return <PreviewLinkCard href={'#task/'+task.id} src={taskPhoto(task.category)||'/favicon.svg'} followCursor={false}><PreviewLinkCardTrigger className="task-preview-link" onClick={e=>{e.preventDefault();onOpen()}}>{task.title}</PreviewLinkCardTrigger><PreviewLinkCardPanel className="task-link-preview"><PreviewLinkCardImage alt=""/><div><b>{task.title}</b><span>{localizedTime(task.estimated_seconds)}</span></div></PreviewLinkCardPanel></PreviewLinkCard>}
