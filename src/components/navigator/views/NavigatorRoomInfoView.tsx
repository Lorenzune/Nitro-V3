import { CreateLinkEvent, GetCustomRoomFilterMessageComposer, GetGuestRoomMessageComposer, GetSessionDataManager, NavigatorSearchComposer, RemoveOwnRoomRightsRoomMessageComposer, RoomControllerLevel, RoomMuteComposer, RoomSettingsComposer, ToggleStaffPickMessageComposer, UpdateHomeRoomMessageComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaLink, FaSignOutAlt } from 'react-icons/fa';
import { DispatchUiEvent, GetGroupInformation, GetUserProfile, LocalizeText, ReportType, SendMessageComposer, ToggleFavoriteRoom } from '../../../api';
import { Column, Flex, LayoutBadgeImageView, LayoutRoomThumbnailView, NitroCardContentView, NitroCardView, Text, UserProfileIconView } from '../../../common';
import { RoomWidgetThumbnailEvent } from '../../../events';
import { useHasPermission, useHelp, useNavigatorData, useRoom } from '../../../hooks';
import { classNames } from '../../../layout';

export interface NavigatorRoomInfoViewProps {
    onCloseClick: () => void;
}

export const NavigatorRoomInfoView: FC<NavigatorRoomInfoViewProps> = props =>
{
    const { onCloseClick = null } = props;
    const [ isRoomPicked, setIsRoomPicked ] = useState(false);
    const [ isRoomMuted, setIsRoomMuted ] = useState(false);
    const { report = null } = useHelp();
    const { navigatorData, favouriteRoomIds } = useNavigatorData();
    const { roomSession = null } = useRoom();
    const canManageAnyRoom = useHasPermission('acc_anyroomowner');
    const canStaffPick = useHasPermission('acc_staff_pick');

    const enteredRoomId = navigatorData?.enteredGuestRoom?.roomId ?? 0;

    useEffect(() =>
    {
        if(!enteredRoomId) return;
        SendMessageComposer(new GetGuestRoomMessageComposer(enteredRoomId, false, false));
    }, [ enteredRoomId ]);

    const isRoomInFavouritesList = useMemo(() =>
    {
        if(!enteredRoomId) return false;

        return favouriteRoomIds.some((id: any) =>
        {
            if(id && typeof id === 'object')
            {
                if('roomId' in id) return Number(id.roomId) === enteredRoomId;
                if('id' in id) return Number(id.id) === enteredRoomId;
            }

            return String(id) === String(enteredRoomId);
        });
    }, [ favouriteRoomIds, enteredRoomId ]);

    const hasPermission = (permission: string) =>
    {
        if(!navigatorData?.enteredGuestRoom) return false;

        switch(permission)
        {
            case 'settings':
                return (GetSessionDataManager().userId === navigatorData.enteredGuestRoom.ownerId || canManageAnyRoom);
            case 'staff_pick':
                return canStaffPick;
            case 'floor':
                return roomSession?.controllerLevel >= RoomControllerLevel.GUEST;
            case 'guest':
                return roomSession?.controllerLevel === RoomControllerLevel.GUEST;
            default: return false;
        }
    };

    const getTradeModeText = (): string =>
    {
        if((navigatorData.enteredGuestRoom as any).tradeMode === 1) return LocalizeText('trading.mode.free');

        return LocalizeText('trading.mode.not.allowed');
    };

    const processAction = (action: string, value?: string) =>
    {
        if(!navigatorData?.enteredGuestRoom) return;

        const roomId = navigatorData.enteredGuestRoom.roomId;

        switch(action)
        {
            case 'set_home_room':
            {
                let newRoomId = -1;
                if(navigatorData.homeRoomId !== roomId) newRoomId = roomId;
                if(newRoomId > 0) SendMessageComposer(new UpdateHomeRoomMessageComposer(newRoomId));
                return;
            }
            case 'navigator_search_tag':
                CreateLinkEvent(`navigator/search/${ value }`);
                SendMessageComposer(new NavigatorSearchComposer('hotel_view', `tag:${ value }`));
                return;
            case 'open_room_thumbnail_camera':
                DispatchUiEvent(new RoomWidgetThumbnailEvent(RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL));
                return;
            case 'open_group_info':
                GetGroupInformation(navigatorData.enteredGuestRoom.habboGroupId);
                return;
            case 'toggle_room_link':
                CreateLinkEvent('navigator/toggle-room-link');
                return;
            case 'open_room_settings':
                SendMessageComposer(new RoomSettingsComposer(roomId));
                return;
            case 'toggle_pick':
                setIsRoomPicked(prev => !prev);
                SendMessageComposer(new ToggleStaffPickMessageComposer(roomId));
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'toggle_mute':
                setIsRoomMuted(prev => !prev);
                SendMessageComposer(new RoomMuteComposer());
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'room_filter':
                SendMessageComposer(new GetCustomRoomFilterMessageComposer(roomId));
                return;
            case 'open_floorplan_editor':
                CreateLinkEvent('floor-editor/toggle');
                return;
            case 'report_room':
                report(ReportType.ROOM, { roomId, roomName: navigatorData.enteredGuestRoom.roomName });
                return;
            case 'room_favourite':
                ToggleFavoriteRoom(roomId, isRoomInFavouritesList);
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'remove_rights':
                SendMessageComposer(new RemoveOwnRoomRightsRoomMessageComposer(roomId));
                return;
            case 'close':
                onCloseClick();
                return;
        }
    };

    useEffect(() =>
    {
        if(!navigatorData) return;
        setIsRoomPicked(navigatorData.currentRoomIsStaffPick);
        if(navigatorData.enteredGuestRoom) setIsRoomMuted(navigatorData.enteredGuestRoom.allInRoomMuted);
    }, [ navigatorData ]);

    if(!navigatorData?.enteredGuestRoom) return null;

    return (
        <NitroCardView className="nitro-room-info !w-[360px] max-w-[calc(100vw-16px)]" theme="primary-slim">
            <NitroCardContentView className="room-info image-rendering-pixelated !p-2 text-black bg-[#f2f2eb] border border-black rounded-[8px]" overflow="hidden">
                <button
                    type="button"
                    aria-label={ LocalizeText('generic.close') }
                    className="absolute top-1 end-1 z-10 flex size-5 items-center justify-center rounded border border-black bg-[#b7342b] text-[14px] font-bold leading-none text-white"
                    onClick={ () => processAction('close') }>
                    x
                </button>
                <Flex gap={ 2 } overflow="hidden" className="mb-2">
                    <LayoutRoomThumbnailView
                        className="!w-[110px] !h-[110px] !rounded-none !border-[#333] bg-[#c6c6bd]"
                        customUrl={ navigatorData.enteredGuestRoom.officialRoomPicRef }
                        roomId={ navigatorData.enteredGuestRoom.roomId }>
                        { navigatorData.enteredGuestRoom.habboGroupId > 0 &&
                            <LayoutBadgeImageView badgeCode={ navigatorData.enteredGuestRoom.groupBadgeCode } className="absolute top-0 start-0 m-1" isGroup={ true } /> }
                        { hasPermission('settings') && <i className="bottom-0 end-0 m-1 cursor-pointer nitro-icon icon-camera-small absolute" onClick={ () => processAction('open_room_thumbnail_camera') } /> }
                    </LayoutRoomThumbnailView>
                    <Column grow gap={ 1 } overflow="hidden" className="min-h-[110px] rounded-[6px] bg-white px-2 py-1">
                        <Text bold wrap className="text-[13px] leading-[15px] pe-4">
                            { navigatorData.enteredGuestRoom.roomName }
                        </Text>
                        { navigatorData.enteredGuestRoom.description &&
                            <Text small overflow="auto" className="text-[12px] leading-[14px] text-black">
                                { navigatorData.enteredGuestRoom.description }
                            </Text> }
                    </Column>
                </Flex>

                <Flex className="mb-2 w-full" gap={ 2 }>
                    <Column className="w-1/2" gap={ 1 }>
                        { navigatorData.enteredGuestRoom.showOwner &&
                            <Flex pointer alignItems="center" gap={ 1 } onClick={ () => GetUserProfile(navigatorData.enteredGuestRoom.ownerId) }>
                                <UserProfileIconView userId={ navigatorData.enteredGuestRoom.ownerId } />
                                <Text small bold underline className="truncate">{ navigatorData.enteredGuestRoom.ownerName }</Text>
                            </Flex> }
                    </Column>
                    <Column className="w-1/2" gap={ 1 }>
                        { navigatorData.enteredGuestRoom.habboGroupId > 0 &&
                            <Flex pointer alignItems="center" gap={ 1 } onClick={ () => processAction('open_group_info') }>
                                <i className="icon icon-navigator-room-group" />
                                <Text small bold underline className="truncate">{ navigatorData.enteredGuestRoom.groupName }</Text>
                            </Flex> }
                    </Column>
                </Flex>

                <Flex className="w-full" gap={ 3 }>
                    <Column className="w-1/2" gap={ 1 }>
                        <Flex gap={ 2 } alignItems="center">
                            <Text small bold>{ LocalizeText('navigator.roompopup.property.trading') }</Text>
                            <Text small>{ getTradeModeText() }</Text>
                        </Flex>
                        <Flex gap={ 2 } alignItems="center">
                            <Text small bold>{ LocalizeText('navigator.roompopup.property.max_users') }</Text>
                            <Text small>{ navigatorData.enteredGuestRoom.maxUserCount }</Text>
                        </Flex>
                    </Column>
                    <Column className="w-1/2" gap={ 1 }>
                        { GetSessionDataManager().userId !== navigatorData.enteredGuestRoom.ownerId &&
                            <Flex pointer alignItems="center" gap={ 2 } onClick={ () => processAction('room_favourite') }>
                                <i className={ classNames('icon icon-navigator-favorite-room', isRoomInFavouritesList ? 'active' : '') } />
                                <Text small>{ LocalizeText('navigator.room.popup.room.info.favorite') }</Text>
                            </Flex> }
                        <Flex pointer alignItems="center" gap={ 2 } onClick={ () => processAction('set_home_room') }>
                            <i className={ classNames('icon icon-navigator-my-room', (navigatorData.homeRoomId !== navigatorData.enteredGuestRoom.roomId) ? '' : 'active') } />
                            <Text small>{ LocalizeText('navigator.room.popup.room.info.home') }</Text>
                        </Flex>
                        <Flex pointer alignItems="center" gap={ 2 } onClick={ () => processAction('report_room') }>
                            <i className="icon icon-navigator-room-report" />
                            <Text small>{ LocalizeText('navigator.room.popup.report.room') }</Text>
                        </Flex>
                    </Column>
                </Flex>

                { (navigatorData.enteredGuestRoom.tags.length > 0) &&
                    <Flex gap={ 1 } className="mt-2 flex-wrap">
                        { navigatorData.enteredGuestRoom.tags.map(tag => (
                            <Text key={ tag } pointer className="nitro-card-row px-1 cursor-pointer text-xs" onClick={ () => processAction('navigator_search_tag', tag) }>
                                #{ tag }
                            </Text>
                        )) }
                    </Flex> }

                <Flex justifyContent="end" gap={ 2 } className="mt-2">
                    { hasPermission('staff_pick') &&
                        <Text small pointer underline onClick={ () => processAction('toggle_pick') }>{ LocalizeText(isRoomPicked ? 'navigator.staffpicks.unpick' : 'navigator.staffpicks.pick') }</Text> }
                    { hasPermission('settings') &&
                        <>
                            <Text small pointer underline onClick={ () => processAction('open_room_settings') }>{ LocalizeText('navigator.room.popup.info.room.settings') }</Text>
                            <Text small pointer underline onClick={ () => processAction('toggle_mute') }>{ LocalizeText(isRoomMuted ? 'navigator.muteall_on' : 'navigator.muteall_off') }</Text>
                            <Text small pointer underline onClick={ () => processAction('room_filter') }>{ LocalizeText('navigator.roomsettings.roomfilter') }</Text>
                        </> }
                    { hasPermission('floor') &&
                        <Text small pointer underline onClick={ () => processAction('open_floorplan_editor') }>{ LocalizeText('open.floor.plan.editor') }</Text> }
                    <FaLink className="cursor-pointer fa-icon" title={ LocalizeText('navigator.embed.caption') } onClick={ () => processAction('toggle_room_link') } />
                    { hasPermission('guest') &&
                        <FaSignOutAlt className="cursor-pointer fa-icon" title={ LocalizeText('navigator.roominfo.removerights.tooltip') } onClick={ () => processAction('remove_rights') } /> }
                </Flex>
            </NitroCardContentView>
        </NitroCardView>
    );
};
