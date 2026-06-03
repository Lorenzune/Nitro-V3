import { FC, useEffect, useRef } from 'react';
import { LayoutAvatarImageView } from '../../../../common';
import { MentionSuggestion } from '../../../../hooks/mentions/useMentionAutocomplete';

interface ChatInputMentionSelectorViewProps
{
    suggestions: MentionSuggestion[];
    selectedIndex: number;
    onSelect: (suggestion: MentionSuggestion) => void;
    onHover: (index: number) => void;
}

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

    return (
        <div ref={ listRef } className="absolute bottom-full left-0 w-full bg-[#e8e8e8] border-2 border-black border-b-0 rounded-t-lg max-h-[240px] overflow-y-auto z-[1070]">
            { suggestions.map((suggestion, index) => (
                <div
                    key={ suggestion.name }
                    className={ `px-2 py-1 cursor-pointer text-sm flex items-center gap-2 ${ index === selectedIndex ? 'bg-[#283F5D] text-white' : 'hover:bg-gray-300' }` }
                    onClick={ () => onSelect(suggestion) }
                    onMouseEnter={ () => onHover(index) }
                >
                    <div className="mention-suggest-avatar">
                        { suggestion.isAlias
                            ? <span className="mention-suggest-alias">@</span>
                            : <LayoutAvatarImageView headOnly direction={ 2 } figure={ suggestion.figure } /> }
                    </div>
                    <span className="font-bold">@{ suggestion.name }</span>
                </div>
            )) }
        </div>
    );
};
