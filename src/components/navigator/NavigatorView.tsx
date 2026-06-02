import { NitroCard } from '@layout/NitroCard';
import { AddLinkEventTracker, ConvertGlobalRoomIdMessageComposer, FindNewFriendsMessageComposer, HabboWebTools, ILinkEventTracker, LegacyExternalInterface, NavigatorInitComposer, RemoveLinkEventTracker, RoomSessionEvent } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import savesSearchIcon from '../../assets/images/navigator/saves-search/search_save.png';
import createRoomImg from '../../assets/images/navigator/swf/create_room_large.png';
import randomRoomImg from '../../assets/images/navigator/swf/random_room_large.png';
import promoteRoomImg from '../../assets/images/navigator/swf/promote_room_large.png';
import { CreateLinkEvent, LocalizeText, SendMessageComposer, TryVisitRoom } from '../../api';
import { Flex, Text, WidgetErrorBoundary } from '../../common';
import { useNavigatorData, useNavigatorSearch, useNavigatorUiState, useNavigatorUiStore, useNitroEvent } from '../../hooks';
import { classNames } from '../../layout';
import { NavigatorDoorStateView } from './views/NavigatorDoorStateView';
import { NavigatorRoomCreatorView } from './views/NavigatorRoomCreatorView';
import { NavigatorRoomInfoView } from './views/NavigatorRoomInfoView';
import { NavigatorRoomLinkView } from './views/NavigatorRoomLinkView';
import { NavigatorRoomSettingsView } from './views/room-settings/NavigatorRoomSettingsView';
import { NavigatorSearchResultView } from './views/search/NavigatorSearchResultView';
import { NavigatorSearchSavesResultView } from './views/search/NavigatorSearchSavesResultView';
import { NavigatorSearchView } from './views/search/NavigatorSearchView';

export const NavigatorView: FC<{}> = () =>
{
    const { topLevelContext, topLevelContexts, navigatorData, navigatorSearches } = useNavigatorData();
    const { searchResult, isFetching } = useNavigatorSearch();
    const { isVisible, isCreatorOpen, isRoomInfoOpen, isRoomLinkOpen, isOpenSavesSearches, needsInit, currentTabCode } = useNavigatorUiState();
    const [ isMobileLayout, setIsMobileLayout ] = useState(false);
    const [ isLandscape, setIsLandscape ] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useNitroEvent<RoomSessionEvent>(RoomSessionEvent.CREATED, event =>
    {
        useNavigatorUiStore.getState().hide();
        useNavigatorUiStore.getState().closeCreator();
    });

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                const store = useNavigatorUiStore.getState();
                switch(parts[1])
                {
                    case 'show':
                        store.show();
                        return;
                    case 'hide':
                        store.hide();
                        return;
                    case 'toggle':
                        store.toggle();
                        return;
                    case 'toggle-room-info':
                        store.toggleRoomInfo();
                        return;
                    case 'toggle-room-link':
                        store.toggleRoomLink();
                        return;
                    case 'goto':
                        if(parts.length <= 2) return;
                        if(parts[2] === 'home')
                        {
                            if(navigatorData.homeRoomId <= 0) return;
                            TryVisitRoom(navigatorData.homeRoomId);
                            return;
                        }
                        TryVisitRoom(parseInt(parts[2]));
                        return;
                    case 'create':
                        store.openCreator();
                        return;
                    case 'search':
                        if(parts.length <= 2) return;
                        const code = parts[2];
                        const value = parts.length > 3 ? parts[3] : '';
                        store.setTab(code);
                        if(value) store.setFilter(value);
                        store.show();
                        return;
                }
            },
            eventUrlPrefix: 'navigator/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ navigatorData ]);

    useEffect(() =>
    {
        if(!searchResult) return;
        if(elementRef.current) elementRef.current.scrollTop = 0;
    }, [ searchResult ]);

    useEffect(() =>
    {
        if(!isVisible || !needsInit) return;
        SendMessageComposer(new NavigatorInitComposer());
        useNavigatorUiStore.getState().markInitDone();
    }, [ isVisible, needsInit ]);

    useEffect(() =>
    {
        LegacyExternalInterface.addCallback(HabboWebTools.OPENROOM, (k: string) => SendMessageComposer(new ConvertGlobalRoomIdMessageComposer(k)));
    }, []);

    useEffect(() =>
    {
        const updateLayout = () =>
        {
            const mobile = window.matchMedia('(max-width: 991.98px)').matches || window.matchMedia('(pointer: coarse)').matches;

            setIsMobileLayout(mobile);
            setIsLandscape(window.matchMedia('(orientation: landscape)').matches);
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        window.addEventListener('orientationchange', updateLayout);

        return () =>
        {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('orientationchange', updateLayout);
        };
    }, []);

    const activeTabCode = currentTabCode || topLevelContext?.code;

    const selectNavigatorTab = (code: string) =>
    {
        const store = useNavigatorUiStore.getState();

        store.closeCreator();
        store.setTab(code);
    };

    const renderDesktopNavigator = () => (
        <NitroCard
            className={ `${ isOpenSavesSearches ? 'w-[600px] min-w-[600px]' : 'w-navigator-w min-w-navigator-w' } h-navigator-h min-h-navigator-h habbo-swf-window habbo-swf-navigator-window habbo-navigator-desktop` }
            uniqueKey="navigator">
            <NitroCard.Header
                headerText={ LocalizeText(isCreatorOpen ? 'navigator.createroom.title' : 'navigator.title') }
                onCloseClick={ () => useNavigatorUiStore.getState().hide() } />
            <NitroCard.Tabs>
                <NitroCard.TabItem
                    isActive={ isOpenSavesSearches }
                    title={ LocalizeText('navigator.tooltip.left.show.hide') }
                    onClick={ () => useNavigatorUiStore.getState().toggleSavesSearches() }>
                    <img src={ savesSearchIcon } alt="" style={{ width: 18, height: 18 }} />
                </NitroCard.TabItem>
                { topLevelContexts && topLevelContexts.length > 0 && topLevelContexts.map((context, index) =>
                    <NitroCard.TabItem
                        key={ index }
                        isActive={ !isCreatorOpen && activeTabCode === context.code }
                        onClick={ () => selectNavigatorTab(context.code) }>
                        { LocalizeText('navigator.toplevelview.' + context.code) }
                    </NitroCard.TabItem>) }
                <NitroCard.TabItem
                    isActive={ isCreatorOpen }
                    onClick={ () => useNavigatorUiStore.getState().openCreator() }>
                    <FaPlus className="fa-icon" />
                </NitroCard.TabItem>
            </NitroCard.Tabs>
            <NitroCard.Content className="habbo-navigator-desktop-content" isLoading={ isFetching }>
                { !isCreatorOpen &&
                    <div className="flex h-full overflow-hidden gap-2">
                        { isOpenSavesSearches &&
                            <div className="overflow-hidden pr-1 shrink-0">
                                <NavigatorSearchSavesResultView searches={ navigatorSearches || [] } />
                            </div> }
                        <div className="flex flex-col w-full overflow-hidden gap-2">
                            <NavigatorSearchView />
                            <div ref={ elementRef } className="flex flex-col flex-1 min-h-0 overflow-auto gap-2">
                                { searchResult && searchResult.results.map((result, index) => <NavigatorSearchResultView key={ index } searchResult={ result } />) }
                                { searchResult && (!searchResult.results || searchResult.results.length === 0) &&
                                    <div className="nitro-card-panel px-3 py-2 text-sm text-muted">
                                        { LocalizeText(searchResult.code === 'myworld_view' ? 'navigator.roomsettings.moderation.none' : 'navigator.search.returned.no.results') }
                                    </div> }
                            </div>
                            <Flex className="nitro-card-divider pt-2 border-t gap-2">
                                <Flex pointer alignItems="center" justifyContent="center"
                                    className="flex-1 h-[60px] cursor-pointer bg-no-repeat pl-16"
                                    style={ { backgroundImage: `url(${ createRoomImg })`, backgroundSize: '100% 100%' } }
                                    onClick={ () => useNavigatorUiStore.getState().openCreator() }>
                                    <Text variant="white" bold className="text-xs drop-shadow">
                                        { LocalizeText('navigator.createroom.create') }
                                    </Text>
                                </Flex>
                                { searchResult?.code !== 'myworld_view' && searchResult?.code !== 'roomads_view' &&
                                    <Flex pointer alignItems="center" justifyContent="center"
                                        className="flex-1 h-[60px] cursor-pointer bg-no-repeat pl-16"
                                        style={ { backgroundImage: `url(${ randomRoomImg })`, backgroundSize: '100% 100%' } }
                                        onClick={ () => SendMessageComposer(new FindNewFriendsMessageComposer()) }>
                                        <Text variant="white" bold className="text-xs drop-shadow">
                                            { LocalizeText('navigator.random.room') }
                                        </Text>
                                    </Flex> }
                                { (searchResult?.code === 'myworld_view' || searchResult?.code === 'roomads_view') &&
                                    <Flex pointer alignItems="center" justifyContent="center"
                                        className="flex-1 h-[60px] cursor-pointer bg-no-repeat pl-16"
                                        style={ { backgroundImage: `url(${ promoteRoomImg })`, backgroundSize: '100% 100%' } }
                                        onClick={ () => CreateLinkEvent('catalog/open/room_event') }>
                                        <Text variant="white" bold className="text-xs drop-shadow">
                                            { LocalizeText('navigator.promote.room') }
                                        </Text>
                                    </Flex> }
                            </Flex>
                        </div>
                    </div> }
                { isCreatorOpen &&
                    <WidgetErrorBoundary name="NavigatorRoomCreator">
                        <NavigatorRoomCreatorView showBackButton />
                    </WidgetErrorBoundary> }
            </NitroCard.Content>
        </NitroCard>
    );

    const renderMobileNavigator = () => (
        <div className="fixed inset-0 z-[1200] flex flex-col overflow-hidden bg-[#d9ded7] text-[#111]">
            <div className="relative flex items-center justify-between gap-2 bg-[#30728c] px-3 py-2 text-white shadow-[0_1px_0_rgba(0,0,0,0.45)]">
                <div className="z-10 flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={ LocalizeText('widget.memenu.back') }
                        onClick={ () => useNavigatorUiStore.getState().closeCreator() }
                        className={ classNames(
                            'flex size-8 shrink-0 items-center justify-center rounded-full border border-[#163747] bg-[#4f6874] text-[18px] font-bold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:brightness-110 active:translate-y-px',
                            !isCreatorOpen && 'opacity-0 pointer-events-none'
                        ) }>
                        ←
                    </button>
                    <button
                        type="button"
                        aria-label={ LocalizeText('navigator.tooltip.left.show.hide') }
                        title={ LocalizeText('navigator.tooltip.left.show.hide') }
                        className={ classNames(
                            'flex size-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold transition-colors',
                            isOpenSavesSearches ? 'border-[#f7f6f0] bg-[#f8a900] text-white' : 'border-[#163747] bg-[#f8a900] text-white'
                        ) }
                        onClick={ () => useNavigatorUiStore.getState().toggleSavesSearches() }>
                        <img src={ savesSearchIcon } alt="" className="size-4" />
                    </button>
                    <button
                        type="button"
                        aria-label={ LocalizeText('navigator.createroom.create') }
                        className={ classNames(
                            'flex size-8 shrink-0 items-center justify-center rounded-full border text-[14px] font-bold transition-colors',
                            isCreatorOpen ? 'border-[#f7f6f0] bg-[#4f6874] text-white' : 'border-[#163747] bg-[#4f6874] text-white'
                        ) }
                        onClick={ () => useNavigatorUiStore.getState().openCreator() }>
                        <FaPlus className="fa-icon" />
                    </button>
                </div>
                <div className="pointer-events-none absolute left-24 right-14 top-1/2 flex -translate-y-1/2 flex-col items-center text-center">
                    <span className="truncate text-[16px] font-bold leading-none">
                        { LocalizeText(isCreatorOpen ? 'navigator.createroom.title' : 'navigator.title') }
                    </span>
                </div>
                <button
                    type="button"
                    aria-label={ LocalizeText('generic.close') }
                    onClick={ () => useNavigatorUiStore.getState().hide() }
                    className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#163747] bg-[#a52b2b] text-[20px] font-bold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:brightness-110 active:translate-y-px">
                    ×
                </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto border-b border-[#b8beb5] bg-[#ecebe2] px-2 py-2">
                { topLevelContexts && topLevelContexts.length > 0 && topLevelContexts.map((context, index) =>
                    <button
                        key={ index }
                        type="button"
                        className={ classNames(
                            'flex h-10 shrink-0 items-center rounded-full border px-3 text-[12px] font-bold transition-colors',
                            (!isCreatorOpen && activeTabCode === context.code) ? 'border-[#30728c] bg-[#30728c] text-white' : 'border-[#bec3bb] bg-[#f7f6f0] text-[#2e2e2e]'
                        ) }
                        onClick={ () => selectNavigatorTab(context.code) }>
                        { LocalizeText('navigator.toplevelview.' + context.code) }
                    </button>) }
            </div>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                { isOpenSavesSearches &&
                    <div className={ classNames(
                        'min-h-0 overflow-hidden border border-[#b8beb5] bg-[#efeee8]',
                        isLandscape ? 'w-[240px] shrink-0 border-l-0 border-y-0' : 'absolute inset-2 z-20 rounded-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                    ) }>
                        <div className="h-full overflow-auto p-2">
                            <NavigatorSearchSavesResultView searches={ navigatorSearches || [] } />
                        </div>
                    </div> }

                <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden p-2">
                    { !isCreatorOpen &&
                        <>
                            <NavigatorSearchView />
                            <div ref={ elementRef } className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto rounded-[14px] border border-[#bcc2b8] bg-[#f8f7f2] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                                { searchResult && searchResult.results.map((result, index) => <NavigatorSearchResultView key={ index } searchResult={ result } />) }
                                { searchResult && (!searchResult.results || searchResult.results.length === 0) &&
                                    <div className="rounded-[10px] border border-[#c6ccc2] bg-[#efefe8] px-3 py-2 text-[12px] text-[#5f696d]">
                                        { LocalizeText(searchResult.code === 'myworld_view' ? 'navigator.roomsettings.moderation.none' : 'navigator.search.returned.no.results') }
                                    </div> }
                            </div>
                        </> }
                    { isCreatorOpen &&
                        <WidgetErrorBoundary name="NavigatorRoomCreator">
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#bcc2b8] bg-[#f8f7f2] p-2">
                                <NavigatorRoomCreatorView />
                            </div>
                        </WidgetErrorBoundary> }
                </div>
            </div>
        </div>
    );

    return (
        <>
            { isVisible && (isMobileLayout ? renderMobileNavigator() : renderDesktopNavigator()) }
            <WidgetErrorBoundary name="NavigatorDoorState">
                <NavigatorDoorStateView />
            </WidgetErrorBoundary>
            { isRoomInfoOpen &&
                <WidgetErrorBoundary name="NavigatorRoomInfo">
                    <NavigatorRoomInfoView onCloseClick={ () => useNavigatorUiStore.getState().setRoomInfoOpen(false) } />
                </WidgetErrorBoundary> }
            { isRoomLinkOpen &&
                <WidgetErrorBoundary name="NavigatorRoomLink">
                    <NavigatorRoomLinkView onCloseClick={ () => useNavigatorUiStore.getState().setRoomLinkOpen(false) } />
                </WidgetErrorBoundary> }
            <WidgetErrorBoundary name="NavigatorRoomSettings">
                <NavigatorRoomSettingsView />
            </WidgetErrorBoundary>
        </>
    );
};
