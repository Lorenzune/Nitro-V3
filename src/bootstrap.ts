import { getClientMode, installSecureFetch, secureUrl } from './secure-assets';

installSecureFetch();

const setBootDebug = (message: string) =>
{
    try
    {
        (window as any).__nitroBootDebug = message;
        const secureNode = document.getElementById('nitro-secure-debug');

        if(secureNode) secureNode.textContent = `${ secureNode.textContent }\n${ message }`;
    }
    catch {}
};

setBootDebug('boot: secure fetch installed');

const search = new URLSearchParams(window.location.search);
const clientMode = getClientMode();
const cacheBustUrl = (path: string): string =>
{
    const url = new URL(path.replace(/^\/+/, ''), `${ window.location.origin }/`);

    url.searchParams.set('v', Date.now().toString(36));

    return url.toString();
};

(window as any).NitroSecureApiUrl = clientMode.apiBaseUrl || window.location.origin;
(window as any).NitroClientMode = clientMode;
(window as any).NitroConfig = {
    'config.urls': [
        clientMode.secureAssetsEnabled ? secureUrl('config', 'renderer-config.json', true) : cacheBustUrl('renderer-config.json'),
        clientMode.secureAssetsEnabled ? secureUrl('config', 'ui-config.json', true) : cacheBustUrl('ui-config.json')
    ],
    'sso.ticket': search.get('sso') || null,
    'forward.type': search.get('room') ? 2 : -1,
    'forward.id': search.get('room') || 0,
    'friend.id': search.get('friend') || 0
};

setBootDebug('boot: NitroConfig assigned');

import('./index')
    .then(() => setBootDebug('boot: app bundle imported'))
    .catch(error =>
    {
        setBootDebug(`boot: import failed ${ error?.message || error }`);
        throw error;
    });
