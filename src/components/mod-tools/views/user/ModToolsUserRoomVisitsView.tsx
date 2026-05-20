import { GetRoomVisitsMessageComposer, RoomVisitsData, RoomVisitsEvent } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { FaClock, FaDoorOpen, FaSignInAlt } from 'react-icons/fa';
import { SendMessageComposer, TryVisitRoom } from '../../../../api';
import { DraggableWindowPosition, InfiniteScroll, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';

interface ModToolsUserRoomVisitsViewProps
{
    userId: number;
    onCloseClick: () => void;
}

export const ModToolsUserRoomVisitsView: FC<ModToolsUserRoomVisitsViewProps> = props =>
{
    const { userId = null, onCloseClick = null } = props;
    const [ roomVisitData, setRoomVisitData ] = useState<RoomVisitsData>(null);

    useMessageEvent<RoomVisitsEvent>(RoomVisitsEvent, event =>
    {
        const parser = event.getParser();

        if(parser.data.userId !== userId) return;

        setRoomVisitData(parser.data);
    });

    useEffect(() =>
    {
        SendMessageComposer(new GetRoomVisitsMessageComposer(userId));
    }, [ userId ]);

    if(!userId) return null;

    const rows = roomVisitData?.rooms ?? [];
    const isEmpty = rows.length === 0;

    return (
        <NitroCardView className="nitro-mod-tools-user-visits min-w-[400px] max-w-[460px] max-h-[460px]" theme="primary-slim" windowPosition={ DraggableWindowPosition.TOP_LEFT }>
            <NitroCardHeaderView headerText={ 'User Visits' } onCloseClick={ onCloseClick } />
            <NitroCardContentView className="text-black" gap={ 1 }>
                {/* Header strip */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-transparent rounded p-2 border border-sky-100">
                    <FaDoorOpen className="text-sky-600 shrink-0" size={ 14 } />
                    <div className="text-sm font-semibold leading-tight grow">Recent visited rooms</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-white border-zinc-200">
                        { rows.length } { rows.length === 1 ? 'entry' : 'entries' }
                    </span>
                </div>

                {/* Table head */}
                <div className="grid grid-cols-[60px_1fr_80px] gap-2 text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                    <div className="flex items-center gap-1"><FaClock size={ 10 } /> Time</div>
                    <div>Room name</div>
                    <div className="text-right">Action</div>
                </div>

                {/* Rows */}
                { isEmpty
                    ? <div className="flex flex-col items-center justify-center gap-1 py-6 opacity-50 text-sm">
                        <FaDoorOpen size={ 22 } />
                        <span>No recent visits</span>
                    </div>
                    : <div className="flex flex-col grow min-h-0 overflow-hidden">
                        <InfiniteScroll rowRender={ row => (
                            <div className="grid grid-cols-[60px_1fr_80px] gap-2 items-center px-1 py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02] hover:bg-sky-50 transition-colors">
                                <span className="font-mono text-[.75rem] opacity-70 tabular-nums">
                                    { row.enterHour.toString().padStart(2, '0') }:{ row.enterMinute.toString().padStart(2, '0') }
                                </span>
                                <span className="truncate font-medium">{ row.roomName }</span>
                                <button
                                    className="inline-flex items-center justify-end gap-1 text-sky-700 hover:text-sky-900 hover:underline text-xs"
                                    onClick={ () => TryVisitRoom(row.roomId) }
                                    title="Visit room">
                                    <FaSignInAlt size={ 10 } /> Visit
                                </button>
                            </div>
                        ) } rows={ rows } />
                    </div> }
            </NitroCardContentView>
        </NitroCardView>
    );
};
