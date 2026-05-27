import { FlatCreatedEvent, NavigatorSearchComposer, NavigatorSearchEvent,
    NavigatorSearchResultSet, RoomSettingsUpdatedEvent } from '@nitrots/nitro-renderer';
import { useNitroEventInvalidator, useNitroQuery } from '../../api/nitro-query';
import { useNavigatorUiStore } from './navigatorUiStore';

const SEARCH_BASE_KEY = [ 'navigator', 'search' ] as const;

/**
 * TanStack Query wrapper for navigator search.
 *
 * Cache key: ['navigator', 'search', tabCode, filter]
 * - Fires NavigatorSearchComposer(tabCode, filter) on miss.
 * - Listens for NavigatorSearchEvent and resolves with the result.
 * - accept-filter: rejects events whose result.code !== tabCode (defends
 *   against server-side cross-tab pushes resolving the wrong query slot).
 * - Disabled when tabCode is '' (initial state, before metadata arrives).
 * - Invalidates on FlatCreatedEvent (new room created) and
 *   RoomSettingsUpdatedEvent (room renamed / settings changed).
 */
export const useNavigatorSearch = () =>
{
    const tabCode = useNavigatorUiStore(s => s.currentTabCode);
    const filter  = useNavigatorUiStore(s => s.currentFilter);

    const query = useNitroQuery<NavigatorSearchEvent, NavigatorSearchResultSet | null>({
        key: [ ...SEARCH_BASE_KEY, tabCode, filter ],
        request: () => new NavigatorSearchComposer(tabCode, filter),
        parser: NavigatorSearchEvent,
        select: e => e.getParser()?.result ?? null,
        accept: e =>
        {
            const result = e.getParser()?.result;
            return !!result && result.code === tabCode;
        },
        enabled: !!tabCode,
        staleTime: 30_000
    });

    useNitroEventInvalidator(FlatCreatedEvent, [ ...SEARCH_BASE_KEY ]);
    useNitroEventInvalidator(RoomSettingsUpdatedEvent, [ ...SEARCH_BASE_KEY ]);

    return {
        searchResult: query.data ?? null,
        isFetching: query.isFetching,
        refetch: query.refetch
    };
};
