import { FC, useEffect, useRef } from 'react';
import { LayoutAvatarImageView } from '../../../../common';

export type MentionSuggestionKind = 'user' | 'alias';

export interface MentionSuggestion
{
    key: string;
    kind: MentionSuggestionKind;
    /** Display name shown in the row (e.g. "DuckieTM" or "all"). */
    name: string;
    /** Token that's actually inserted into the chat input (without the @). */
    insertToken: string;
    /** Figure string for the avatar tile - only set for 'user' rows. */
    figure?: string;
    /** Optional sub-label, e.g. for "Staff Chat". */
    description?: string;
}

interface ChatInputMentionSelectorViewProps
{
    suggestions: MentionSuggestion[];
    selectedIndex: number;
    onSelect: (suggestion: MentionSuggestion) => void;
    onHover: (index: number) => void;
}

/**
 * @-autocomplete popover. Suggestion list comes pre-filtered from the parent:
 * real users (RoomObjectUserType.USER = 1) only, never pets / bots / rentable
 * bots / monster plants, plus the configured broadcast aliases.
 */
export const ChatInputMentionSelectorView: FC<ChatInputMentionSelectorViewProps> = props =>
{
    const { suggestions = [], selectedIndex = 0, onSelect = null, onHover = null } = props;
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        if(!listRef.current) return;

        const selected = listRef.current.children[selectedIndex] as HTMLElement;

        if(selected) selected.scrollIntoView({ block: 'nearest' });
    }, [ selectedIndex ]);

    if(suggestions.length === 0) return null;

    return (
        <div ref={ listRef } className="absolute bottom-full left-0 w-full bg-[#e8e8e8] border-2 border-black border-b-0 rounded-t-lg max-h-[240px] overflow-y-auto z-[1070]">
            { suggestions.map((suggestion, index) =>
            {
                const isSelected = (index === selectedIndex);
                const rowClass = `px-3 py-1.5 cursor-pointer text-sm flex items-center gap-2 ${ isSelected ? 'bg-[#283F5D] text-white' : 'hover:bg-gray-300' }`;

                return (
                    <div
                        key={ suggestion.key }
                        className={ rowClass }
                        onClick={ () => onSelect(suggestion) }
                        onMouseEnter={ () => onHover(index) }
                    >
                        { suggestion.kind === 'user' && suggestion.figure
                            ? (
                                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-black/10">
                                    <LayoutAvatarImageView
                                        figure={ suggestion.figure }
                                        direction={ 2 }
                                        headOnly
                                        style={ { backgroundSize: 'auto', backgroundPosition: '-22px -32px' } }
                                    />
                                </div>
                            )
                            : (
                                <div className="flex items-center justify-center h-11 w-11 rounded-full bg-black/20 text-white text-[14px] font-bold shrink-0">@</div>
                            ) }
                        <span className="font-bold">@{ suggestion.name }</span>
                        { suggestion.description && <span className={ `text-xs ${ isSelected ? 'text-gray-300' : 'text-gray-500' }` }>{ suggestion.description }</span> }
                    </div>
                );
            }) }
        </div>
    );
};
