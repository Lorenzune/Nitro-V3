import { CSSProperties, FC, useCallback, useEffect, useState } from 'react';
import { FaMinus, FaPlus, FaTimes } from 'react-icons/fa';
import { MdGridOn } from 'react-icons/md';
import { LocalizeText } from '../../../../api';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from '../actions/WiredActionBaseView';

const SOURCE_USER_TRIGGER  = 0;
const SOURCE_USER_SIGNAL   = 1;
const SOURCE_USER_CLICKED  = 2;

const USER_SOURCES  = [
    { value: SOURCE_USER_TRIGGER,  label: 'wiredfurni.params.sources.users.0'   },
    { value: SOURCE_USER_SIGNAL,   label: 'wiredfurni.params.sources.users.201' },
    { value: SOURCE_USER_CLICKED,  label: 'wiredfurni.params.sources.users.11'  },
];

const TILE_W     = 22;
const TILE_H     = 11;
const GRID_RANGE = 4;
const CX         = GRID_RANGE * TILE_W + TILE_W / 2;
const CY         = GRID_RANGE * TILE_H + TILE_H / 2;
const GRID_PX_W  = (GRID_RANGE * 2 + 1) * TILE_W;
const GRID_PX_H  = (GRID_RANGE * 2 + 1) * TILE_H;

type Tile = { x: number; y: number };

const tileIncluded = (tiles: Tile[], x: number, y: number) =>
    tiles.some(t => t.x === x && t.y === y);

const tileLeft = (rx: number, ry: number) =>
    CX + (rx - ry) * (TILE_W / 2) - TILE_W / 2;

const tileTop = (rx: number, ry: number) =>
    CY + (rx + ry) * (TILE_H / 2) - TILE_H / 2;

interface GridProps {
    selectedTiles: Tile[];
    invert: boolean;
    onToggle: (x: number, y: number) => void;
}

const NeighborhoodGrid: FC<GridProps> = ({ selectedTiles, invert, onToggle }) =>
{
    const tiles: JSX.Element[] = [];

    for (let ry = -GRID_RANGE; ry <= GRID_RANGE; ry++)
    {
        for (let rx = -GRID_RANGE; rx <= GRID_RANGE; rx++)
        {
            const isCenter   = rx === 0 && ry === 0;
            const isSelected = tileIncluded(selectedTiles, rx, ry);
            const isActive   = invert ? !isSelected : isSelected;
            const left       = tileLeft(rx, ry);
            const top_       = tileTop(rx, ry);
            const zIdx       = rx + ry + GRID_RANGE * 2 + 10;

            const bgColor = isCenter
                ? '#ff9500'
                : isActive
                    ? '#3399ff'
                    : '#2a3042';

            const borderColor = isCenter
                ? '#cc6600'
                : isActive
                    ? '#1166cc'
                    : '#1a2032';

            const diamond: CSSProperties = {
                position:        'absolute',
                width:           TILE_W,
                height:          TILE_H,
                left,
                top:             top_,
                clipPath:        'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: bgColor,
                cursor:          isCenter ? 'default' : 'pointer',
                zIndex:          zIdx,
            };

            const border: CSSProperties = {
                position:        'absolute',
                width:           TILE_W + 2,
                height:          TILE_H + 2,
                left:            left - 1,
                top:             top_ - 1,
                clipPath:        'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: borderColor,
                zIndex:          zIdx - 1,
                pointerEvents:   'none',
            };

            tiles.push(
                <div key={ `b-${ rx }-${ ry }` } style={ border } />,
                <div
                    key={ `t-${ rx }-${ ry }` }
                    style={ diamond }
                    title={ `(${ rx }, ${ ry })` }
                    onClick={ () => !isCenter && onToggle(rx, ry) }
                />,
            );
        }
    }

    return (
        <div style={ { position: 'relative', width: GRID_PX_W, height: GRID_PX_H, flexShrink: 0 } }>
            { tiles }
        </div>
    );
};

export const WiredSelectorUsersNeighborhoodView: FC<{}> = () =>
{
    const [ selectedTiles, setSelectedTiles ] = useState<Tile[]>([]);
    const [ filterExisting, setFilterExisting ] = useState(false);
    const [ invert, setInvert ] = useState(false);
    const [ sourceType, setSourceType ] = useState(SOURCE_USER_TRIGGER);
    const [ curX, setCurX ] = useState(0);
    const [ curY, setCurY ] = useState(0);

    const { trigger = null, setIntParams } = useWired();

    useEffect(() =>
    {
        if(!trigger) return;

        const p = trigger.intData;
        if(p.length >= 1) setSourceType(Math.min(p[0], SOURCE_USER_CLICKED));
        if(p.length >= 2) setFilterExisting(p[1] === 1);
        if(p.length >= 3) setInvert(p[2] === 1);

        if(p.length >= 6)
        {
            const n     = p[5];
            const tiles: Tile[] = [];

            for(let i = 0; i < n; i++)
            {
                const xi = 6 + i * 2;
                if(xi + 1 < p.length) tiles.push({ x: p[xi], y: p[xi + 1] });
            }

            setSelectedTiles(tiles);
        }
        else
        {
            setSelectedTiles([]);
        }
    }, [ trigger ]);

    const save = useCallback(() =>
    {
        const params: number[] = [
            sourceType,
            filterExisting ? 1 : 0,
            invert ? 1 : 0,
            selectedTiles.length,
            ...selectedTiles.flatMap(t => [ t.x, t.y ]),
        ];

        setIntParams(params);
    }, [ sourceType, filterExisting, invert, selectedTiles, setIntParams ]);

    const toggleTile = useCallback((x: number, y: number) =>
    {
        setSelectedTiles(prev =>
            tileIncluded(prev, x, y)
                ? prev.filter(t => !(t.x === x && t.y === y))
                : [ ...prev, { x, y } ]
        );
    }, []);

    const addTile = useCallback(() =>
    {
        if(curX === 0 && curY === 0) return;
        if(!tileIncluded(selectedTiles, curX, curY))
            setSelectedTiles(prev => [ ...prev, { x: curX, y: curY } ]);
    }, [ curX, curY, selectedTiles ]);

    const removeTile = useCallback(() =>
    {
        setSelectedTiles(prev => prev.filter(t => !(t.x === curX && t.y === curY)));
    }, [ curX, curY ]);

    const clearTiles = useCallback(() => setSelectedTiles([]), []);

    const loadDefaultPattern = useCallback(() =>
    {
        const tiles: Tile[] = [];

        for(let y = -2; y <= 2; y++)
        {
            for(let x = -2; x <= 2; x++)
            {
                if(x === 0 && y === 0) continue;
                tiles.push({ x, y });
            }
        }

        setSelectedTiles(tiles);
    }, []);

    const sourceIndex = USER_SOURCES.findIndex(s => s.value === sourceType);

    const prevSource = () =>
        setSourceType(USER_SOURCES[(sourceIndex - 1 + USER_SOURCES.length) % USER_SOURCES.length].value);

    const nextSource = () =>
        setSourceType(USER_SOURCES[(sourceIndex + 1) % USER_SOURCES.length].value);

    return (
        <WiredActionBaseView hasSpecialInput={ true } requiresFurni={ 0 } save={ save } hideDelay={ true } cardStyle={ { width: '400px' } }>
            <div className="flex flex-col gap-2">

                <Text bold>{ LocalizeText('wiredfurni.params.neighborhood_selection') }</Text>

                <div className="flex items-center gap-1">
                    <Button variant="success" className="px-2 py-1" onClick={ addTile } title={ LocalizeText('wiredfurni.tooltip.select.tile') }>
                        <FaPlus />
                    </Button>
                    <Button variant="danger" className="px-2 py-1" onClick={ removeTile } title={ LocalizeText('wiredfurni.tooltip.remove.tile') }>
                        <FaMinus />
                    </Button>
                    <Button variant="primary" className="px-2 py-1" onClick={ loadDefaultPattern } title={ LocalizeText('wiredfurni.tooltip.remove.5x5_tile') }>
                        <MdGridOn />
                    </Button>
                    <Button variant="secondary" className="px-2 py-1" onClick={ clearTiles } title={ LocalizeText('wiredfurni.tooltip.remove.clear_tile') }>
                        <FaTimes />
                    </Button>
                </div>

                <div className="flex justify-center">
                    <NeighborhoodGrid selectedTiles={ selectedTiles } invert={ invert } onToggle={ toggleTile } />
                </div>

                <div className="flex items-center gap-2">
                    <Text small>X:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={ { width: 56 } }
                        value={ curX }
                        min={ -GRID_RANGE }
                        max={ GRID_RANGE }
                        onChange={ e => setCurX(parseInt(e.target.value) || 0) } />
                    <Text small>Y:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={ { width: 56 } }
                        value={ curY }
                        min={ -GRID_RANGE }
                        max={ GRID_RANGE }
                        onChange={ e => setCurY(parseInt(e.target.value) || 0) } />
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{ LocalizeText('wiredfurni.params.selector_options_selector') }</Text>

                <label className="flex items-center gap-1">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={ filterExisting }
                        onChange={ e => setFilterExisting(e.target.checked) } />
                    <Text small>{ LocalizeText('wiredfurni.params.selector_option.0') }</Text>
                </label>

                <label className="flex items-center gap-1">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={ invert }
                        onChange={ e => setInvert(e.target.checked) } />
                    <Text small>{ LocalizeText('wiredfurni.params.selector_option.1') }</Text>
                </label>

                <hr className="m-0 bg-dark" />

                <Text bold>{ LocalizeText('wiredfurni.params.sources.merged.title.neighborhood') }</Text>

                <div className="flex items-center gap-2">
                    <Button variant="primary" className="px-2 py-1" onClick={ prevSource }>&#8249;</Button>
                    <div className="flex flex-1 items-center justify-center">
                        <Text small>{ LocalizeText(USER_SOURCES[sourceIndex].label) }</Text>
                    </div>
                    <Button variant="primary" className="px-2 py-1" onClick={ nextSource }>&#8250;</Button>
                </div>

            </div>
        </WiredActionBaseView>
    );
};
