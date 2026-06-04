import { MentionReceivedEvent, MentionsListEvent, RequestMentionsComposer } from '@nitrots/nitro-renderer';
import { useCallback, useEffect, useRef } from 'react';
import { GetConfigurationValue, IMentionEntry, LocalizeText, NotificationBubbleType, PlaySound, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useNotificationActions } from '../notification';
import { addMention, setMentions } from './mentionsStore';

// Dedicated mention chime served from nitro-assets/sounds/<sample>.mp3.
const MENTION_SOUND_SAMPLE = 'mentions_notification';

// Floor on the gap between bubble/chime notifications. Even if the server
// (or an injected packet stream) pushes mentions faster than this, the user
// gets at most one chime + bubble per window. The mentions list itself
// still updates in real time - this only throttles the in-screen feedback.
const NOTIFICATION_THROTTLE_MS = 1500;
// Drop any single mention packet whose mention id we've already seen this
// session, so a replay attack can't re-trigger the bubble + sound even if
// the client store dropped the entry already.
const SEEN_IDS_MAX = 500;

export const useMentionMessages = (): void =>
{
    const { showSingleBubble } = useNotificationActions();
    const lastNotificationRef = useRef<number>(0);
    const seenIdsRef = useRef<Set<number>>(new Set());

    const onMentionsList = useCallback((event: MentionsListEvent) =>
    {
        const list = event.getParser().mentions;

        setMentions(list.map(m => ({
            mentionId: m.mentionId,
            senderId: m.senderId,
            senderUsername: m.senderUsername,
            senderFigure: m.senderFigure ?? '',
            roomId: m.roomId,
            roomName: m.roomName,
            message: m.message,
            mentionType: m.mentionType,
            timestamp: m.timestamp,
            read: m.read
        })));
    }, []);

    const onMentionReceived = useCallback((event: MentionReceivedEvent) =>
    {
        if(!GetConfigurationValue<boolean>('mentions_ui.enabled', true)) return;

        const m = event.getParser().mention;

        if(!m || !Number.isFinite(m.mentionId) || m.mentionId <= 0) return;

        const seen = seenIdsRef.current;
        if(seen.has(m.mentionId)) return;
        seen.add(m.mentionId);
        if(seen.size > SEEN_IDS_MAX)
        {
            const first = seen.values().next().value as number | undefined;
            if(first !== undefined) seen.delete(first);
        }

        const entry: IMentionEntry = {
            mentionId: m.mentionId,
            senderId: m.senderId,
            senderUsername: m.senderUsername,
            senderFigure: m.senderFigure ?? '',
            roomId: m.roomId,
            roomName: m.roomName,
            message: m.message,
            mentionType: m.mentionType,
            timestamp: m.timestamp,
            read: false
        };

        addMention(entry);

        const now = Date.now();
        if((now - lastNotificationRef.current) < NOTIFICATION_THROTTLE_MS) return;
        lastNotificationRef.current = now;

        if(GetConfigurationValue<boolean>('mentions_ui.sound', true)) PlaySound(MENTION_SOUND_SAMPLE);

        showSingleBubble(
            LocalizeText('mentions.notification', [ 'sender', 'room' ], [ entry.senderUsername, entry.roomName ]),
            NotificationBubbleType.INFO,
            null,
            'mentions/toggle',
            entry.senderUsername
        );
    }, [ showSingleBubble ]);

    useMessageEvent<MentionsListEvent>(MentionsListEvent, onMentionsList);
    useMessageEvent<MentionReceivedEvent>(MentionReceivedEvent, onMentionReceived);

    useEffect(() =>
    {
        if(!GetConfigurationValue<boolean>('mentions_ui.enabled', true)) return;

        SendMessageComposer(new RequestMentionsComposer());
    }, []);
};
