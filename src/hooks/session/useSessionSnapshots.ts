import { GetEventDispatcher, GetRoomSessionManager, GetSessionDataManager, GetSoundManager, IRoomSessionSnapshot, IRoomUserData, ISoundVolumesSnapshot, IUserDataSnapshot, NitroEventType } from '@nitrots/nitro-renderer';
import { useMemo } from 'react';
import { useExternalSnapshot } from '../events/useExternalSnapshot';

/**
 * React-side consumers for the referentially-stable snapshot getters
 * the renderer exposes (Nitro_Render_V3 v2.1.0+ pattern).
 *
 * Every hook here is a thin `useSyncExternalStore` wrapper: it subscribes
 * to the corresponding `NitroEventType.*_UPDATED` invalidation event and
 * reads the matching `getXxxSnapshot()`. Because the renderer guarantees
 * snapshot reference invariance until invalidation, React's bailout logic
 * skips re-renders when the snapshot is unchanged — so widgets that read
 * the same slice across many components share a single subscription and
 * only re-paint when the underlying state actually changes.
 *
 * Prefer these over reaching into the manager directly with
 * `GetSessionDataManager().userId` etc., which never trigger a re-render
 * when the value changes.
 */

const subscribeTo = (eventType: string) => (onChange: () => void) =>
    GetEventDispatcher().subscribe(eventType, onChange);

export const useUserDataSnapshot = (): Readonly<IUserDataSnapshot> =>
    useExternalSnapshot(
        subscribeTo(NitroEventType.SESSION_DATA_UPDATED),
        () => GetSessionDataManager().getUserDataSnapshot()
    );

export const useActiveRoomSessionSnapshot = (): Readonly<IRoomSessionSnapshot> | null =>
    useExternalSnapshot(
        subscribeTo(NitroEventType.ROOM_SESSION_UPDATED),
        () => GetRoomSessionManager().getActiveRoomSessionSnapshot()
    );

export const useIgnoredUsersSnapshot = (): ReadonlyArray<string> =>
    useExternalSnapshot(
        subscribeTo(NitroEventType.IGNORED_USERS_UPDATED),
        () => GetSessionDataManager().ignoredUsersManager.getIgnoredUsersSnapshot()
    );

/**
 * Reactive predicate built on top of `useIgnoredUsersSnapshot`.
 * Re-renders only when the array reference flips (i.e. someone is added
 * or removed) — not on unrelated session updates.
 */
export const useIsUserIgnored = (name: string): boolean =>
{
    const list = useIgnoredUsersSnapshot();

    return useMemo(() => list.includes(name), [ list, name ]);
};

export const useGroupBadgesSnapshot = (): ReadonlyMap<number, string> =>
    useExternalSnapshot(
        subscribeTo(NitroEventType.GROUP_BADGES_UPDATED),
        () => GetSessionDataManager().groupInformationManager.getGroupBadgesSnapshot()
    );

/**
 * Returns the badge id for a given group, reactive. Empty string when
 * the badge isn't known (matches the legacy `getGroupBadge` fallback).
 */
export const useGroupBadge = (groupId: number): string =>
{
    const badges = useGroupBadgesSnapshot();

    return useMemo(() => badges.get(groupId) ?? '', [ badges, groupId ]);
};

export const useVolumesSnapshot = (): Readonly<ISoundVolumesSnapshot> =>
    useExternalSnapshot(
        subscribeTo(NitroEventType.SOUND_VOLUMES_UPDATED),
        () => GetSoundManager().getVolumesSnapshot()
    );

/**
 * Returns the active room's user list, reactive. Returns an empty
 * frozen array when no room session is active (matches the renderer's
 * "no active session" shape).
 *
 * The room session itself is read via the active-room snapshot —
 * `ROOM_USER_LIST_UPDATED` fires on user join/leave/update inside the
 * active session, but the underlying `userDataManager` reference
 * follows whichever session is current, so we re-resolve it on every
 * snapshot read. The empty-array fallback is also frozen so consumers
 * relying on referential stability don't accidentally trigger renders
 * by getting a fresh `[]` each call when no session is active.
 */
const EMPTY_USER_LIST = Object.freeze<IRoomUserData[]>([]) as ReadonlyArray<IRoomUserData>;

export const useRoomUserListSnapshot = (): ReadonlyArray<IRoomUserData> =>
    useExternalSnapshot(
        // Subscribe to BOTH events: ROOM_USER_LIST_UPDATED fires for
        // join/leave/update inside the active session, but
        // ROOM_SESSION_UPDATED fires when the active session itself
        // changes (room change) — and the underlying `userDataManager`
        // reference flips with it, so we need to re-read.
        (onChange) =>
        {
            const dispatcher = GetEventDispatcher();
            const offList = dispatcher.subscribe(NitroEventType.ROOM_USER_LIST_UPDATED, onChange);
            const offSession = dispatcher.subscribe(NitroEventType.ROOM_SESSION_UPDATED, onChange);

            return () =>
            {
                offList();
                offSession();
            };
        },
        () => GetRoomSessionManager().getActiveRoomSessionSnapshot()?.session?.userDataManager?.getRoomUserListSnapshot() ?? EMPTY_USER_LIST
    );
