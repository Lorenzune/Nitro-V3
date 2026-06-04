import { IMentionEntry } from '../../api/mentions';

// Hard cap on how many mentions we hold in memory at once. The server's
// initial list is capped (mentions.store.limit, default 50) but live
// MentionReceived packets feed into addMention unbounded - so a server bug
// or a hostile/injected stream could otherwise grow the array and the DOM
// forever. 200 is comfortably more than any realistic active user has and
// well below anything that would inflate memory.
const MAX_MENTIONS = 200;

let mentions: IMentionEntry[] = [];
const listeners = new Set<() => void>();

const emit = () => { for(const l of listeners) l(); };

const cap = (list: IMentionEntry[]): IMentionEntry[] =>
    (list.length > MAX_MENTIONS) ? list.slice(0, MAX_MENTIONS) : list;

export const subscribeMentions = (onChange: () => void): (() => void) =>
{
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
};

export const getMentionsSnapshot = (): ReadonlyArray<IMentionEntry> => mentions;

export const getUnreadCount = (): number => mentions.reduce((n, m) => n + (m.read ? 0 : 1), 0);

export const setMentions = (list: IMentionEntry[]): void =>
{
    mentions = cap([...list].sort((a, b) => b.mentionId - a.mentionId));
    emit();
};

export const addMention = (entry: IMentionEntry): void =>
{
    // Drop entries the server failed to persist (generatedId 0 / negative).
    // The server hardening already refuses to push these, but the client
    // stays defensive in case a stale gameserver or an injected packet sends
    // one - without this guard, the old "id !== 0" dedup carve-out let
    // every duplicate through.
    if(!entry || !Number.isFinite(entry.mentionId) || entry.mentionId <= 0) return;
    if(mentions.some(m => m.mentionId === entry.mentionId)) return;

    mentions = cap([entry, ...mentions]);
    emit();
};

export const markRead = (mentionId: number): void =>
{
    mentions = mentions.map(m => m.mentionId === mentionId ? { ...m, read: true } : m);
    emit();
};

export const markAllRead = (): void =>
{
    mentions = mentions.map(m => m.read ? m : { ...m, read: true });
    emit();
};

export const removeMention = (mentionId: number): void =>
{
    const next = mentions.filter(m => m.mentionId !== mentionId);
    if(next.length === mentions.length) return;
    mentions = next;
    emit();
};

export const resetMentions = (): void => { mentions = []; emit(); };
