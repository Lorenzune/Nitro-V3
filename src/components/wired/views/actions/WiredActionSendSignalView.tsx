import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

const ANTENNA_PICKED  = 0;
const ANTENNA_TRIGGER = 1;

const FORWARD_NONE      = 0;
const FORWARD_TRIGGER   = 1;
const FORWARD_SELECTOR  = 200;
const FORWARD_SIGNAL    = 201;

const FURNI_FORWARD_OPTIONS = [
    { value: FORWARD_TRIGGER,  label: 'wiredfurni.params.sources.furni.0' },
    { value: FORWARD_SELECTOR, label: 'wiredfurni.params.sources.furni.200' },
    { value: FORWARD_SIGNAL,   label: 'wiredfurni.params.sources.furni.201' },
];

const USER_FORWARD_OPTIONS = [
    { value: FORWARD_TRIGGER,  label: 'wiredfurni.params.sources.users.0' },
    { value: FORWARD_SELECTOR, label: 'wiredfurni.params.sources.users.200' },
    { value: FORWARD_SIGNAL,   label: 'wiredfurni.params.sources.users.201' },
];

export const WiredActionSendSignalView: FC<{}> = () =>
{
    const [ antennaSource, setAntennaSource ]   = useState(ANTENNA_PICKED);
    const [ furniForward, setFurniForward ]     = useState(FORWARD_NONE);
    const [ userForward, setUserForward ]       = useState(FORWARD_NONE);
    const [ signalPerFurni, setSignalPerFurni ] = useState(false);
    const [ signalPerUser, setSignalPerUser ]   = useState(false);
    const [ showAdvanced, setShowAdvanced ]     = useState(false);

    const { trigger = null, setIntParams } = useWired();

    useEffect(() =>
    {
        if(!trigger) return;

        const p = trigger.intData;
        if(p.length >= 1) setAntennaSource(p[0]);
        if(p.length >= 2) setFurniForward(p[1]);
        if(p.length >= 3) setUserForward(p[2]);
        if(p.length >= 4) setSignalPerFurni(p[3] === 1);
        if(p.length >= 5) setSignalPerUser(p[4] === 1);

        if(p.length >= 1 && (p[0] !== ANTENNA_PICKED || p[1] !== FORWARD_NONE ||
            p[2] !== FORWARD_NONE || (p.length >= 4 && p[3] === 1) || (p.length >= 5 && p[4] === 1)))
        {
            setShowAdvanced(true);
        }
    }, [ trigger ]);

    const save = useCallback(() =>
    {
        setIntParams([
            antennaSource,
            furniForward,
            userForward,
            signalPerFurni ? 1 : 0,
            signalPerUser ? 1 : 0,
        ]);
    }, [ antennaSource, furniForward, userForward, signalPerFurni, signalPerUser, setIntParams ]);

    return (
        <WiredActionBaseView
            hasSpecialInput={ true }
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
			cardStyle={ { width: '400px' } }
            save={ save }>
            <div className="flex flex-col gap-2">

                <div
                    className="cursor-pointer text-center"
                    onClick={ () => setShowAdvanced(!showAdvanced) }>
                    <Text small underline>
                        { showAdvanced
                            ? LocalizeText('wiredfurni.params.hide_advanced')
                            : LocalizeText('wiredfurni.params.show_advanced') }
                    </Text>
                </div>

                { showAdvanced && <>

                    { /* --- Antennas --- */ }
                    <Text bold>{ LocalizeText('wiredfurni.params.sources.furni.title.signal_antenna') }</Text>
                    <div className="form-check form-switch">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="signal-antenna-toggle"
                            role="switch"
                            checked={ antennaSource === ANTENNA_PICKED }
                            onChange={ () => setAntennaSource(antennaSource === ANTENNA_PICKED ? ANTENNA_TRIGGER : ANTENNA_PICKED) } />
                        <label className="form-check-label" htmlFor="signal-antenna-toggle">
                            <Text small>{ LocalizeText('wiredfurni.params.sources.furni.100') }</Text>
                        </label>
                    </div>

                    { /* --- Furni to forward --- */ }
                    <Text bold>{ LocalizeText('wiredfurni.params.sources.furni.title.signal_forward') }</Text>
                    <div className="flex items-center gap-2">
                        <div className="form-check form-switch flex-1 mb-0">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="signal-furni-toggle"
                                role="switch"
                                checked={ furniForward !== FORWARD_NONE }
                                onChange={ e => setFurniForward(e.target.checked ? FORWARD_TRIGGER : FORWARD_NONE) } />
                            <label className="form-check-label" htmlFor="signal-furni-toggle">
                                <Text small>{ LocalizeText('wiredfurni.params.sources.furni.200') }</Text>
                            </label>
                        </div>
                        { furniForward !== FORWARD_NONE &&
                            <select
                                className="form-select form-select-sm"
                                style={ { width: 'auto', minWidth: '160px' } }
                                value={ furniForward }
                                onChange={ e => setFurniForward(parseInt(e.target.value)) }>
                                { FURNI_FORWARD_OPTIONS.map(opt =>
                                    <option key={ opt.value } value={ opt.value }>{ LocalizeText(opt.label) }</option>
                                ) }
                            </select>
                        }
                    </div>

                    { /* --- Users to forward --- */ }
                    <Text bold>{ LocalizeText('wiredfurni.params.sources.users.title.signal_forward') }</Text>
                    <div className="flex items-center gap-2">
                        <div className="form-check form-switch flex-1 mb-0">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="signal-user-toggle"
                                role="switch"
                                checked={ userForward !== FORWARD_NONE }
                                onChange={ e => setUserForward(e.target.checked ? FORWARD_TRIGGER : FORWARD_NONE) } />
                            <label className="form-check-label" htmlFor="signal-user-toggle">
                                <Text small>{ LocalizeText('wiredfurni.params.sources.users.0') }</Text>
                            </label>
                        </div>
                        { userForward !== FORWARD_NONE &&
                            <select
                                className="form-select form-select-sm"
                                style={ { width: 'auto', minWidth: '160px' } }
                                value={ userForward }
                                onChange={ e => setUserForward(parseInt(e.target.value)) }>
                                { USER_FORWARD_OPTIONS.map(opt =>
                                    <option key={ opt.value } value={ opt.value }>{ LocalizeText(opt.label) }</option>
                                ) }
                            </select>
                        }
                    </div>

                    <Text bold>{ LocalizeText('wiredfurni.params.signal.options') }</Text>
                    <div className="form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="signal-per-furni"
                            checked={ signalPerFurni }
                            onChange={ e => setSignalPerFurni(e.target.checked) } />
                        <label className="form-check-label" htmlFor="signal-per-furni">
                            <Text small>{ LocalizeText('wiredfurni.params.signal.split_furni') }</Text>
                        </label>
                    </div>
                    <div className="form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="signal-per-user"
                            checked={ signalPerUser }
                            onChange={ e => setSignalPerUser(e.target.checked) } />
                        <label className="form-check-label" htmlFor="signal-per-user">
                            <Text small>{ LocalizeText('wiredfurni.params.signal.split_users') }</Text>
                        </label>
                    </div>
                </> }

            </div>
        </WiredActionBaseView>
    );
};
