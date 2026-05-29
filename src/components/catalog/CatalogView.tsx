import { FC } from 'react';
import { useCatalogClassicStyle, useCatalogData } from '../../hooks';
import { CatalogClassicView } from './CatalogClassicView';
import { CatalogModernView } from './CatalogModernView';

export const CatalogView: FC<{}> = () =>
{
    const { catalogLocalizationVersion = 0 } = useCatalogData();
    const [ catalogClassicStyle ] = useCatalogClassicStyle();

    // Modern (Hippiehotel style) is the default; the "stile classico" toggle in
    // user settings (or the global catalog.classic.style flag) switches to the
    // classic catalog. Both views are the Hippiehotel.nl Nitro-V3 originals.
    if(catalogClassicStyle) return (
        <>
            <div className="hidden" data-catalog-localization-version={ catalogLocalizationVersion } />
            <CatalogClassicView />
        </>
    );

    return (
        <>
            <div className="hidden" data-catalog-localization-version={ catalogLocalizationVersion } />
            <CatalogModernView />
        </>
    );
};
