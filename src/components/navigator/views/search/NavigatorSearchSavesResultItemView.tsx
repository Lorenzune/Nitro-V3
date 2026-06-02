import { NavigatorDeleteSavedSearchComposer, NavigatorSavedSearch } from '@nitrots/nitro-renderer';
import { FC, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { Flex, Text } from '../../../../common';
import { useNavigatorUiStore } from '../../../../hooks';

export interface NavigatorSearchSavesResultItemViewProps
{
    search: NavigatorSavedSearch;
}

export const NavigatorSearchSavesResultItemView: FC<NavigatorSearchSavesResultItemViewProps> = props =>
{
    const { search = null } = props;
    const [ isHovered, setIsHovered ] = useState(false);

    const getResultTitle = () =>
    {
        let name = search.code;

        if(!name || !name.length || LocalizeText('navigator.searchcode.title.' + name) === ('navigator.searchcode.title.' + name)) return search.code;

        if(name.startsWith('${')) return name.slice(2, (name.length - 1));

        return ('navigator.searchcode.title.' + name);
    };

    const openSavedSearch = () =>
    {
        const store = useNavigatorUiStore.getState();

        store.closeCreator();
        store.setTab(search.code.split('.').reverse()[0]);
        store.setFilter(search.filter);
    };

    return (
        <Flex grow pointer alignItems="center" gap={ 1 } onMouseEnter={ () => setIsHovered(true) } onMouseLeave={ () => setIsHovered(false) }>
            { isHovered &&
                <i
                    className="nitro-icon icon-navigator-search-delete cursor-pointer flex-shrink-0"
                    title={ LocalizeText('navigator.tooltip.remove.saved.search') }
                    onClick={ () => SendMessageComposer(new NavigatorDeleteSavedSearchComposer(search.id)) }
                /> }
            <Text
                small
                pointer
                variant="black"
                title={ LocalizeText('navigator.tooltip.open.saved.search') }
                onClick={ openSavedSearch }
            >
                { LocalizeText(getResultTitle()) }
            </Text>
        </Flex>
    );
};
