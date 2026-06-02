import { NavigatorSavedSearch } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { FaBolt } from 'react-icons/fa';
import { LocalizeText } from '../../../../api';
import { Column, Flex, Text } from '../../../../common';
import { NavigatorSearchSavesResultItemView } from './NavigatorSearchSavesResultItemView';

export interface NavigatorSearchSavesResultViewProps
{
    searches: NavigatorSavedSearch[];
}

export const NavigatorSearchSavesResultView: FC<NavigatorSearchSavesResultViewProps> = props =>
{
    const { searches = [] } = props;

    return (
        <Column className="nitro-navigator-search-saves-result min-w-[100px] gap-1">
            <Flex className="rounded-[8px] px-2 py-2 bg-[#f8a900]" gap={ 1 } alignItems="center">
                <FaBolt color="white" />
                <Text variant="white">{ LocalizeText('navigator.quick.links.title') }</Text>
            </Flex>
            <Column className="p-1 overflow-x-hidden overflow-y-auto">
                { (searches && searches.length > 0) &&
                    searches.map((search: NavigatorSavedSearch) => (
                        <NavigatorSearchSavesResultItemView key={ search.id } search={ search } />
                    )) }
            </Column>
        </Column>
    );
};
