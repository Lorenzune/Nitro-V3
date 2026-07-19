import { AddLinkEventTracker, GetSoundManager, ILinkEventTracker, ITraxEditorSong, RemoveLinkEventTracker, SoundManagerEvent } from '@nitrots/nitro-renderer';
import { FC, MouseEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, GetDiskColor, localizeWithFallback } from '../../api';
import { GetTraxCartridgeUrl } from '../../assets/images/trax';
import { Button, Column, Flex, LayoutCurrencyIcon, Text } from '../../common';
import { useNitroEvent, usePurse, useTraxEditor } from '../../hooks';
import { NitroCard, NitroInput } from '../../layout';
import { CreateEmptyChannels, ITraxPlacement, ParseTraxSong, SerializeTraxSong, TRAX_CHANNEL_COUNT, TRAX_DEFAULT_UNITS, TRAX_MAX_UNITS, TRAX_MIN_UNITS, TraxChannels } from './TraxSongData';
import { GetTraxSampleId, GetTraxSoundSetForSample, TraxSoundSets } from './TraxSoundSets';

const CELL_WIDTH = 22;
const CARTRIDGES_PER_PAGE = 8;
const RACK_PAGES = Math.ceil(TraxSoundSets.length / CARTRIDGES_PER_PAGE);
const CHANNEL_COLORS = ['#e0433c', '#3f8fe0', '#43c243', '#e0c23c'];
const DEFAULT_SLOT_SETS = [1, 2, 3, 4];
const ERROR_TEXTS: Record<number, [string, string]> = {
    1: ['trax.editor.error.disabled', 'The song editor is disabled on this hotel.'],
    2: ['trax.editor.error.limit', 'You already own the maximum number of songs.'],
    3: ['trax.editor.error.currency', 'You can not afford a new song.'],
    4: ['trax.editor.error.invalid', 'This song could not be saved. Try shortening it.'],
    5: ['trax.editor.error.notfound', 'This song no longer exists.']
};

const formatStamp = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

interface MachineButtonProps {
    title?: string;
    disabled?: boolean;
    accent?: string;
    onClick: () => void;
    children?: ReactNode;
}

const MachineButton: FC<MachineButtonProps> = ({ title = undefined, disabled = false, accent = undefined, onClick, children = null }) => (
    <button
        title={title}
        disabled={disabled}
        onClick={onClick}
        className="flex h-9 w-10 shrink-0 items-center justify-center rounded-[5px] border font-bold"
        style={{
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.35 : 1,
            color: '#ffffff',
            fontSize: 15,
            borderColor: 'rgba(0, 0, 0, 0.55)',
            background: accent
                ? `linear-gradient(rgba(255, 255, 255, 0.22), rgba(0, 0, 0, 0.25)), ${accent}`
                : 'linear-gradient(#66798a, #46545e)',
            boxShadow: 'inset 0 1px rgba(255, 255, 255, 0.35), 0 1px 2px rgba(0, 0, 0, 0.45)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)'
        }}
    >
        {children}
    </button>
);

export const TraxEditorView: FC<{}> = () =>
{
    const [isVisible, setIsVisible] = useState(false);
    const [editingSongId, setEditingSongId] = useState(-1);
    const [songName, setSongName] = useState('');
    const [channels, setChannels] = useState<TraxChannels>(CreateEmptyChannels);
    const [songLength, setSongLength] = useState(TRAX_DEFAULT_UNITS);
    const [slotSets, setSlotSets] = useState<number[]>(DEFAULT_SLOT_SETS);
    const [slotSamples, setSlotSamples] = useState<number[]>([0, 0, 0, 0]);
    const [activeSlot, setActiveSlot] = useState(0);
    const [rackPage, setRackPage] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [hoverCell, setHoverCell] = useState<{ channel: number; unit: number } | null>(null);
    const pendingBuyRef = useRef(false);
    const { songs, maxSongs, costCurrency, costAmount, lastError, loaded, requestSongs, buySong, saveSong, deleteSong, clearError } = useTraxEditor();
    const { getCurrencyAmount } = usePurse();
    const canAfford = costAmount <= 0 || getCurrencyAmount(costCurrency) >= costAmount;
    const isPlayingRef = useRef(false);
    const auditionRef = useRef<HTMLAudioElement | null>(null);
    const playheadRef = useRef<HTMLDivElement | null>(null);
    const playheadRafRef = useRef(0);

    const stopPlayhead = useCallback(() =>
    {
        cancelAnimationFrame(playheadRafRef.current);

        if (playheadRef.current) playheadRef.current.style.display = 'none';
    }, []);

    const startPlayhead = useCallback((totalUnits: number) =>
    {
        const startedAt = performance.now();

        const step = () =>
        {
            const units = (performance.now() - startedAt) / 2000;
            const node = playheadRef.current;

            if (node)
            {
                node.style.display = 'block';
                node.style.left = `${Math.min(units, totalUnits) * CELL_WIDTH}px`;
            }

            if (units < totalUnits) playheadRafRef.current = requestAnimationFrame(step);
        };

        cancelAnimationFrame(playheadRafRef.current);
        playheadRafRef.current = requestAnimationFrame(step);
    }, []);

    const stopAudition = useCallback(() =>
    {
        const audio = auditionRef.current;

        auditionRef.current = null;

        if (!audio) return;

        try
        {
            audio.pause();
            audio.currentTime = 0;
        }
        catch
        {}
    }, []);

    const stopPreview = useCallback(() =>
    {
        if (isPlayingRef.current) GetSoundManager().musicController?.stopPreview();

        isPlayingRef.current = false;
        setIsPlaying(false);
        stopPlayhead();
    }, [stopPlayhead]);

    const hideEditor = useCallback(() =>
    {
        stopAudition();
        stopPreview();
        setIsVisible(false);
    }, [stopAudition, stopPreview]);

    const openSong = useCallback(
        (song: ITraxEditorSong) =>
        {
            stopPreview();
            clearError();

            const parsed = ParseTraxSong(song.data);
            const nextSets = [...DEFAULT_SLOT_SETS];

            parsed.channels.forEach((placements, index) =>
            {
                if (placements.length) nextSets[index] = GetTraxSoundSetForSample(placements[0].sampleId);
            });

            setEditingSongId(song.id);
            setSongName(song.name);
            setChannels(parsed.channels);
            setSongLength(parsed.songLength);
            setSlotSets(nextSets);
            setSlotSamples([0, 0, 0, 0]);
            setActiveSlot(0);
            setIsDirty(false);
        },
        [stopPreview, clearError]
    );

    useEffect(() =>
    {
        if (!pendingBuyRef.current || !songs.length) return;

        pendingBuyRef.current = false;
        openSong(songs[songs.length - 1]);
    }, [songs, openSong]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if (parts.length < 2) return;

                switch (parts[1])
                {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        hideEditor();
                        return;
                }
            },
            eventUrlPrefix: 'trax-editor/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [hideEditor]);

    useEffect(() =>
    {
        if (isVisible) requestSongs();
    }, [isVisible, requestSongs]);

    useEffect(() => () =>
    {
        cancelAnimationFrame(playheadRafRef.current);

        if (isPlayingRef.current) GetSoundManager().musicController?.stopPreview();

        const audio = auditionRef.current;

        auditionRef.current = null;

        if (audio)
        {
            try
            {
                audio.pause();
            }
            catch
            {}
        }
    }, []);

    useNitroEvent<SoundManagerEvent>(SoundManagerEvent.TRAX_SONG_COMPLETE, () =>
    {
        isPlayingRef.current = false;
        setIsPlaying(false);
        stopPlayhead();
    });

    const auditionSample = useCallback((sampleId: number) =>
    {
        stopAudition();

        const url = GetConfigurationValue<string>('external.samples.url', '');
        if (!url) return;

        try
        {
            const audio = new Audio(url.replace('%sample%', sampleId.toString()));

            audio.volume = Math.min(1, Math.max(0, GetSoundManager().traxVolume ?? 0.5));
            audio.onended = () =>
            {
                if (auditionRef.current === audio) auditionRef.current = null;
            };
            auditionRef.current = audio;
            void audio.play().catch(() =>
            {
                if (auditionRef.current === audio) auditionRef.current = null;
            });
        }
        catch
        {}
    }, [stopAudition]);

    const loadCartridge = useCallback((cd: number) =>
    {
        setSlotSets((prev) =>
        {
            const next = [...prev];

            next[activeSlot] = cd;

            return next;
        });
        setSlotSamples((prev) =>
        {
            const next = [...prev];

            next[activeSlot] = 0;

            return next;
        });
    }, [activeSlot]);

    const selectSample = useCallback((slot: number, sampleIndex: number) =>
    {
        setActiveSlot(slot);
        setSlotSamples((prev) =>
        {
            const next = [...prev];

            next[slot] = sampleIndex;

            return next;
        });
        auditionSample(GetTraxSampleId(slotSets[slot], sampleIndex));
    }, [slotSets, auditionSample]);

    const placeSample = useCallback(
        (channel: number, unit: number) =>
        {
            const cd = slotSets[channel];
            const set = TraxSoundSets[cd - 1];
            const sampleIndex = slotSamples[channel];
            const sampleId = GetTraxSampleId(cd, sampleIndex);
            const length = Math.max(1, set?.sampleLengths[sampleIndex] ?? 1);

            if (unit + length > TRAX_MAX_UNITS) return;

            setChannels((prev) =>
            {
                const next = prev.map((placements) => [...placements]);

                next[channel] = next[channel].filter((p) => p.position + p.length <= unit || p.position >= unit + length);
                next[channel].push({ position: unit, sampleId, length });

                return next;
            });
            setSongLength((prev) => Math.max(prev, unit + length));
            setIsDirty(true);
        },
        [slotSets, slotSamples]
    );

    const removePlacement = useCallback((channel: number, placement: ITraxPlacement) =>
    {
        setChannels((prev) =>
        {
            const next = prev.map((placements) => [...placements]);

            next[channel] = next[channel].filter((p) => p !== placement);

            return next;
        });
        setIsDirty(true);
    }, []);

    const shiftSong = useCallback((delta: number) =>
    {
        setChannels((prev) => prev.map((placements) => placements
            .map((p) => ({ ...p, position: p.position + delta }))
            .filter((p) => (p.position >= 0) && ((p.position + p.length) <= TRAX_MAX_UNITS))));
        setIsDirty(true);
    }, []);

    const clearSong = useCallback(() =>
    {
        setChannels(CreateEmptyChannels());
        setIsDirty(true);
    }, []);

    const onChannelClick = useCallback(
        (event: MouseEvent<HTMLDivElement>, channel: number) =>
        {
            const rect = event.currentTarget.getBoundingClientRect();
            const unit = Math.floor((event.clientX - rect.left) / CELL_WIDTH);

            if (unit < 0 || unit >= songLength) return;

            placeSample(channel, unit);
        },
        [placeSample, songLength]
    );

    const onChannelMouseMove = useCallback(
        (event: MouseEvent<HTMLDivElement>, channel: number) =>
        {
            const rect = event.currentTarget.getBoundingClientRect();
            const unit = Math.floor((event.clientX - rect.left) / CELL_WIDTH);

            if (unit < 0 || unit >= songLength)
            {
                setHoverCell(null);
                return;
            }

            setHoverCell((prev) => ((prev && prev.channel === channel && prev.unit === unit) ? prev : { channel, unit }));
        },
        [songLength]
    );

    const togglePreview = useCallback(() =>
    {
        stopAudition();

        if (isPlaying)
        {
            stopPreview();
            return;
        }

        isPlayingRef.current = true;
        setIsPlaying(true);
        void GetSoundManager()
            .musicController?.previewTraxData(SerializeTraxSong(channels, songLength))
            .then(() =>
            {
                if (isPlayingRef.current) startPlayhead(songLength);
            })
            .catch(() =>
            {
                isPlayingRef.current = false;
                setIsPlaying(false);
                stopPlayhead();
            });
    }, [isPlaying, stopAudition, stopPreview, startPlayhead, stopPlayhead, channels, songLength]);

    const saveCurrentSong = useCallback(() =>
    {
        if (editingSongId < 0) return;

        saveSong(editingSongId, songName, SerializeTraxSong(channels, songLength));
        setIsDirty(false);
    }, [editingSongId, songName, channels, songLength, saveSong]);

    const deleteCurrentSong = useCallback(() =>
    {
        if (editingSongId < 0) return;

        stopPreview();
        deleteSong(editingSongId);
        setEditingSongId(-1);
    }, [editingSongId, deleteSong, stopPreview]);

    const buyNewSong = useCallback(() =>
    {
        pendingBuyRef.current = true;
        buySong(localizeWithFallback('trax.editor.new.song.name', 'My new song'));
    }, [buySong]);

    if (!isVisible) return null;

    const emptySlots = Math.max(0, maxSongs - songs.length);
    const rackCartridges = TraxSoundSets.slice(rackPage * CARTRIDGES_PER_PAGE, (rackPage + 1) * CARTRIDGES_PER_PAGE);
    return (
        <NitroCard className="h-[640px] w-[920px] max-w-[98vw]" uniqueKey="trax-editor">
            <NitroCard.Header
                headerText={localizeWithFallback('trax.editor.title', 'Trax Machine')}
                onCloseClick={hideEditor}
            />
            <NitroCard.Content>
                <Flex fullHeight gap={2} className="overflow-hidden">
                    <Column gap={2} className="w-[200px] shrink-0 overflow-y-auto">
                        <Text bold>{localizeWithFallback('trax.editor.my.songs', 'My songs')}</Text>
                        {loaded &&
                            songs.map((song) =>
                            {
                                const isOpen = editingSongId === song.id;
                                const diskColor = GetDiskColor(song.data);

                                return (
                                    <div
                                        key={song.id}
                                        onClick={() => openSong(song)}
                                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-2"
                                        style={{
                                            borderColor: isOpen ? '#2e6f8a' : 'rgba(0, 0, 0, 0.2)',
                                            background: isOpen ? 'linear-gradient(#eaf7fe, #d2ecf9)' : 'linear-gradient(#ffffff, #ececec)',
                                            boxShadow: isOpen ? '0 0 5px rgba(46, 111, 138, 0.55)' : '0 1px 2px rgba(0, 0, 0, 0.15)'
                                        }}
                                    >
                                        <div
                                            className="h-9 w-9 shrink-0 rounded-full border"
                                            style={{
                                                borderColor: 'rgba(0, 0, 0, 0.35)',
                                                background: `radial-gradient(circle at center, #20262b 0 5px, rgba(255, 255, 255, 0.55) 5px 6px, ${diskColor} 6px 100%)`,
                                                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)'
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <span className="block truncate text-[12px] font-bold" style={{ color: '#222222' }}>{song.name}</span>
                                            <span className="block text-[10px]" style={{ color: 'rgba(0, 0, 0, 0.5)' }}>♪ {formatStamp(song.length)}</span>
                                        </div>
                                        {isOpen && <span className="shrink-0 text-[12px]" style={{ color: '#2e6f8a' }}>▶</span>}
                                    </div>
                                );
                            })}
                        {loaded &&
                            Array.from({ length: emptySlots }, (_, index) => (
                                <div
                                    key={`empty-${index}`}
                                    className="flex items-center gap-2 rounded-lg border border-dashed p-2"
                                    style={{ borderColor: 'rgba(0, 0, 0, 0.25)', background: 'rgba(0, 0, 0, 0.03)' }}
                                >
                                    {index === 0 ? (
                                        <Button fullWidth disabled={!canAfford} variant="success" onClick={buyNewSong}>
                                            <Flex alignItems="center" gap={1} justifyContent="center">
                                                <span>{localizeWithFallback('trax.editor.buy.song', 'New song')}</span>
                                                {costAmount > 0 && (
                                                    <>
                                                        <span>{costAmount}</span>
                                                        <LayoutCurrencyIcon type={costCurrency} />
                                                    </>
                                                )}
                                            </Flex>
                                        </Button>
                                    ) : (
                                        <>
                                            <div
                                                className="h-9 w-9 shrink-0 rounded-full border border-dashed"
                                                style={{ borderColor: 'rgba(0, 0, 0, 0.25)' }}
                                            />
                                            <span className="text-[11px]" style={{ color: 'rgba(0, 0, 0, 0.4)' }}>
                                                {localizeWithFallback('trax.editor.empty.slot', 'Empty slot')}
                                            </span>
                                        </>
                                    )}
                                </div>
                            ))}
                        {!!lastError && (
                            <Text small className="text-[#a81a12]">
                                {localizeWithFallback(...(ERROR_TEXTS[lastError] ?? ERROR_TEXTS[4]))}
                            </Text>
                        )}
                    </Column>
                    <Column fullWidth gap={2} className="min-w-0 rounded-lg p-2" style={{ background: 'linear-gradient(#55656f, #37444d)', boxShadow: 'inset 0 1px rgba(255,255,255,0.2)' }}>
                        {editingSongId < 0 && (
                            <Flex center fullHeight>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                    {localizeWithFallback('trax.editor.select.song', 'Select or buy a song on the left to start composing.')}
                                </Text>
                            </Flex>
                        )}
                        {editingSongId >= 0 && (
                            <>
                                {/* Cartridge rack with pager */}
                                <Flex alignItems="center" gap={2}>
                                    <MachineButton
                                        disabled={rackPage <= 0}
                                        onClick={() => setRackPage((prev) => Math.max(0, prev - 1))}
                                    >
                                        ◀
                                    </MachineButton>
                                    <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
                                        {rackCartridges.map((set) => (
                                            <button
                                                key={set.cd}
                                                title={`${set.title} — ${set.artist}`}
                                                onClick={() => loadCartridge(set.cd)}
                                                className={`flex h-8 cursor-pointer items-center gap-1 rounded-[3px] border px-1 ${slotSets[activeSlot] === set.cd ? 'border-white' : 'border-black/50'}`}
                                                style={{
                                                    background: 'linear-gradient(#ececec, #b5b5b5)',
                                                    boxShadow: slotSets[activeSlot] === set.cd ? '0 0 4px rgba(255,255,255,0.8)' : 'inset 0 1px rgba(255,255,255,0.6), 0 1px rgba(0,0,0,0.35)'
                                                }}
                                            >
                                                {GetTraxCartridgeUrl(set.cd) ? (
                                                    <img alt="" className="h-[26px] w-[26px] shrink-0 [image-rendering:pixelated]" src={GetTraxCartridgeUrl(set.cd)} />
                                                ) : (
                                                    <span className="h-5 w-4 shrink-0 rounded-[2px] border border-black/30" style={{ backgroundColor: set.color }} />
                                                )}
                                                <span className="truncate text-left text-[10px] font-bold leading-tight text-black/75">{set.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <MachineButton
                                        disabled={rackPage >= RACK_PAGES - 1}
                                        onClick={() => setRackPage((prev) => Math.min(RACK_PAGES - 1, prev + 1))}
                                    >
                                        ▶
                                    </MachineButton>
                                    <span className="w-10 shrink-0 text-center text-[11px] font-bold" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{rackPage + 1}/{RACK_PAGES}</span>
                                </Flex>
                                {/* Four cartridge slots, one per channel */}
                                <div className="grid grid-cols-4 gap-1">
                                    {Array.from({ length: TRAX_CHANNEL_COUNT }, (_, slot) =>
                                    {
                                        const set = TraxSoundSets[slotSets[slot] - 1];

                                        return (
                                            <div
                                                key={slot}
                                                onClick={() => setActiveSlot(slot)}
                                                className={`cursor-pointer rounded-[4px] border p-1 ${activeSlot === slot ? 'border-white' : 'border-black/50 opacity-80'}`}
                                                style={{
                                                    borderTopWidth: 4,
                                                    borderTopColor: CHANNEL_COLORS[slot],
                                                    background: activeSlot === slot ? 'linear-gradient(#5e7280, #46545e)' : 'linear-gradient(#46545e, #313d45)',
                                                    boxShadow: activeSlot === slot ? `0 0 7px ${CHANNEL_COLORS[slot]}, inset 0 1px rgba(255,255,255,0.3)` : 'none'
                                                }}
                                            >
                                                <Flex alignItems="center" gap={1} className="mb-1 min-w-0">
                                                    <span
                                                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] text-[10px] font-bold text-white"
                                                        style={{ backgroundColor: CHANNEL_COLORS[slot], textShadow: '0 1px 1px rgba(0, 0, 0, 0.6)' }}
                                                    >
                                                        {slot + 1}
                                                    </span>
                                                    {(set && GetTraxCartridgeUrl(set.cd)) ? (
                                                        <img alt="" className="h-[18px] w-[18px] shrink-0 [image-rendering:pixelated]" src={GetTraxCartridgeUrl(set.cd)} />
                                                    ) : (
                                                        <span className="h-3 w-3 shrink-0 rounded-[2px] border border-black/40" style={{ backgroundColor: set?.color ?? '#CACACA' }} />
                                                    )}
                                                    <span className="truncate text-[10px] font-bold" style={{ color: 'rgba(255, 255, 255, 0.9)' }} title={`${set?.title ?? ''} — ${set?.artist ?? ''}`}>{set?.title ?? ''}</span>
                                                </Flex>
                                                <div className="grid grid-cols-9 gap-0.5">
                                                    {(set?.sampleLengths ?? []).map((length, index) => (
                                                        <button
                                                            key={index}
                                                            title={`#${index + 1} — ${length * 2}s`}
                                                            onClick={(event) =>
                                                            {
                                                                event.stopPropagation();
                                                                selectSample(slot, index);
                                                            }}
                                                            className={`h-6 cursor-pointer rounded-[2px] border text-[9px] font-bold text-white ${(slotSamples[slot] === index) ? 'border-white' : 'border-black/40'}`}
                                                            style={{
                                                                backgroundColor: CHANNEL_COLORS[slot],
                                                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
                                                                boxShadow: (slotSamples[slot] === index) ? '0 0 4px rgba(255,255,255,0.9)' : 'inset 0 1px rgba(255,255,255,0.4)'
                                                            }}
                                                        >
                                                            {index + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <Flex alignItems="center" gap={1}>
                                    <MachineButton accent={isPlaying ? '#c2913f' : '#3f9e4a'} title={isPlaying ? localizeWithFallback('trax.editor.stop', 'Stop') : localizeWithFallback('trax.editor.play', 'Play')} onClick={togglePreview}>
                                        {isPlaying ? '❚❚' : '▶'}
                                    </MachineButton>
                                    <MachineButton accent="#c2493f" title={localizeWithFallback('trax.editor.stop', 'Stop')} disabled={!isPlaying} onClick={stopPreview}>
                                        ■
                                    </MachineButton>
                                    <MachineButton accent="#3f7fc2" title={localizeWithFallback('trax.editor.save', 'Save')} disabled={!isDirty} onClick={saveCurrentSong}>
                                        💾
                                    </MachineButton>
                                    <MachineButton accent="#c2913f" title={localizeWithFallback('trax.editor.clear', 'Clear')} onClick={clearSong}>
                                        🧹
                                    </MachineButton>
                                    <MachineButton title={localizeWithFallback('trax.editor.shift.left', 'Move left')} onClick={() => shiftSong(-1)}>
                                        ⇤
                                    </MachineButton>
                                    <MachineButton title={localizeWithFallback('trax.editor.shift.right', 'Move right')} onClick={() => shiftSong(1)}>
                                        ⇥
                                    </MachineButton>
                                    <div className="min-w-0 flex-1">
                                        <NitroInput
                                            value={songName}
                                            maxLength={64}
                                            style={{
                                                color: '#ffffff',
                                                background: 'linear-gradient(#242f36, #2e3b43)',
                                                border: '1px solid rgba(0, 0, 0, 0.55)',
                                                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.45)',
                                                textShadow: '0 1px 1px rgba(0, 0, 0, 0.6)'
                                            }}
                                            onChange={(event) =>
                                            {
                                                setSongName(event.target.value);
                                                setIsDirty(true);
                                            }}
                                        />
                                    </div>
                                    <MachineButton accent="#c2493f" title={localizeWithFallback('trax.editor.delete', 'Delete')} onClick={deleteCurrentSong}>
                                        🗑
                                    </MachineButton>
                                </Flex>
                                {/* Timeline */}
                                <div className="overflow-x-auto rounded border border-black/40 p-2" style={{ background: 'linear-gradient(#222f36, #1a252b)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)' }}>
                                    <div className="relative" style={{ width: songLength * CELL_WIDTH }}>
                                        <div
                                            ref={playheadRef}
                                            className="pointer-events-none absolute"
                                            style={{
                                                display: 'none',
                                                top: 0,
                                                bottom: 18,
                                                width: 3,
                                                backgroundColor: '#ffffff',
                                                boxShadow: '0 0 6px rgba(255, 255, 255, 0.9)',
                                                borderRadius: 2,
                                                zIndex: 30
                                            }}
                                        />
                                        <Column gap={1}>
                                            {Array.from({ length: TRAX_CHANNEL_COUNT }, (_, channel) => (
                                                <div
                                                    key={channel}
                                                    onClick={(event) => onChannelClick(event, channel)}
                                                    onMouseMove={(event) => onChannelMouseMove(event, channel)}
                                                    onMouseLeave={() => setHoverCell(null)}
                                                    className="relative h-10 shrink-0 cursor-crosshair rounded bg-[#2b3f4a]"
                                                    style={{
                                                        width: songLength * CELL_WIDTH,
                                                        boxShadow: `inset 3px 0 0 ${CHANNEL_COLORS[channel]}`,
                                                        backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent ' + (CELL_WIDTH - 1) + 'px, rgba(255,255,255,0.08) ' + (CELL_WIDTH - 1) + 'px, rgba(255,255,255,0.08) ' + CELL_WIDTH + 'px)'
                                                    }}
                                                >
                                                    {hoverCell && hoverCell.channel === channel && (() =>
                                                    {
                                                        const hoverSet = TraxSoundSets[slotSets[channel] - 1];
                                                        const hoverSample = slotSamples[channel];
                                                        const ghostLength = Math.max(1, hoverSet?.sampleLengths[hoverSample] ?? 1);
                                                        const fits = (hoverCell.unit + ghostLength) <= TRAX_MAX_UNITS;

                                                        return (
                                                            <div
                                                                className={`pointer-events-none absolute top-0 z-10 flex h-full items-center justify-center rounded border-2 border-dashed text-[11px] font-bold ${fits ? 'border-white/80 text-black/60' : 'border-[#a81a12] text-[#a81a12]'}`}
                                                                style={{
                                                                    left: hoverCell.unit * CELL_WIDTH,
                                                                    width: ghostLength * CELL_WIDTH,
                                                                    backgroundColor: fits ? `${CHANNEL_COLORS[channel]}99` : 'rgba(168,26,18,0.25)'
                                                                }}
                                                            >
                                                                {fits ? `#${hoverSample + 1}` : '✕'}
                                                            </div>
                                                        );
                                                    })()}
                                                    {channels[channel].map((placement) =>
                                                    {
                                                        const cd = GetTraxSoundSetForSample(placement.sampleId);
                                                        const sampleNumber = placement.sampleId - (cd - 1) * 9;

                                                        return (
                                                            <div
                                                                key={`${placement.position}-${placement.sampleId}`}
                                                                title={`${TraxSoundSets[cd - 1]?.title ?? ''} #${sampleNumber} — ${localizeWithFallback('trax.editor.remove.hint', 'right-click to remove')}`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                onContextMenu={(event) =>
                                                                {
                                                                    event.preventDefault();
                                                                    event.stopPropagation();
                                                                    removePlacement(channel, placement);
                                                                }}
                                                                className="absolute top-0 flex h-full items-center justify-center overflow-hidden rounded border border-black/40 text-[11px] font-bold text-black/70"
                                                                style={{
                                                                    left: placement.position * CELL_WIDTH,
                                                                    width: placement.length * CELL_WIDTH,
                                                                    backgroundColor: CHANNEL_COLORS[channel]
                                                                }}
                                                            >
                                                                {sampleNumber}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </Column>
                                        <div className="relative h-[18px]">
                                            {Array.from({ length: Math.floor(songLength / 5) }, (_, index) => (
                                                <div
                                                    key={index}
                                                    className="absolute top-1 text-[9px] font-bold"
                                                    style={{ left: ((index + 1) * 5 * CELL_WIDTH) - 12, color: 'rgba(255, 255, 255, 0.5)' }}
                                                >
                                                    {formatStamp((index + 1) * 10)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Flex alignItems="center" gap={2}>
                                    <Text small style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{localizeWithFallback('trax.editor.length', 'Length')}: {formatStamp(songLength * 2)}</Text>
                                    <MachineButton
                                        disabled={songLength <= TRAX_MIN_UNITS}
                                        onClick={() =>
                                        {
                                            setSongLength((prev) => Math.max(TRAX_MIN_UNITS, prev - 4));
                                            setChannels((prev) => prev.map((placements) => placements.filter((p) => p.position + p.length <= Math.max(TRAX_MIN_UNITS, songLength - 4))));
                                            setIsDirty(true);
                                        }}
                                    >
                                        −
                                    </MachineButton>
                                    <MachineButton
                                        disabled={songLength >= TRAX_MAX_UNITS}
                                        onClick={() =>
                                        {
                                            setSongLength((prev) => Math.min(TRAX_MAX_UNITS, prev + 4));
                                            setIsDirty(true);
                                        }}
                                    >
                                        +
                                    </MachineButton>
                                </Flex>
                            </>
                        )}
                    </Column>
                </Flex>
            </NitroCard.Content>
        </NitroCard>
    );
};
