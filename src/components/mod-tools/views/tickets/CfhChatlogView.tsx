import { CfhChatlogData, CfhChatlogEvent, GetCfhChatlogMessageComposer } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { useNitroQuery } from '../../../../api/nitro-query';
import { DraggableWindowPosition, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../../common';
import { ChatlogView } from '../chatlog/ChatlogView';

interface CfhChatlogViewProps
{
    issueId: number;
    onCloseClick(): void;
}

export const CfhChatlogView: FC<CfhChatlogViewProps> = props =>
{
    const { onCloseClick = null, issueId = null } = props;

    const { data: chatlogData } = useNitroQuery<CfhChatlogEvent, CfhChatlogData>({
        key: [ 'nitro', 'mod-tools', 'cfh-chatlog', issueId ],
        request: () => new GetCfhChatlogMessageComposer(issueId),
        parser: CfhChatlogEvent,
        accept: e => e.getParser()?.data.issueId === issueId,
        select: e => e.getParser().data,
        enabled: issueId !== null
    });

    return (
        <NitroCardView className="nitro-mod-tools-chatlog min-w-[460px] max-w-[520px] max-h-[500px]" theme="primary-slim" windowPosition={ DraggableWindowPosition.TOP_LEFT }>
            <NitroCardHeaderView headerText={ `Issue #${ issueId } Chatlog` } onCloseClick={ onCloseClick } />
            <NitroCardContentView className="text-black" gap={ 1 }>
                { chatlogData
                    ? <ChatlogView records={ [ chatlogData.chatRecord ] } />
                    : <div className="flex flex-col items-center justify-center gap-2 py-8 opacity-50 text-sm">
                        <FaSpinner className="animate-spin" size={ 22 } />
                        <span>Loading chatlog…</span>
                    </div> }
            </NitroCardContentView>
        </NitroCardView>
    );
};
