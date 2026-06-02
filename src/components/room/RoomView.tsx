import { GetEventDispatcher, GetRenderer, MouseEventType, RoomObjectMouseEvent, RoomObjectTileMouseEvent, RoomSession } from '@nitrots/nitro-renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useRef } from 'react';
import { DispatchMouseEvent, DispatchTouchEvent } from '../../api';
import { useRoom } from '../../hooks';
import { classNames } from '../../layout';
import { RoomSpectatorView } from './spectator/RoomSpectatorView';
import { RoomWidgetsView } from './widgets/RoomWidgetsView';

export const RoomView: FC<{}> = (props) =>
{
    const { roomSession = null } = useRoom();
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        if(!roomSession) return;

        const canvas = GetRenderer().canvas;

        if(!canvas) return;

        canvas.style.touchAction = 'none';
        canvas.style.webkitTouchCallout = 'none';
        canvas.style.webkitUserSelect = 'none';
        canvas.style.userSelect = 'none';

        const supportsPointerEvents = ('PointerEvent' in window);

        canvas.onclick = (event) => DispatchMouseEvent(event);
        canvas.onmousemove = (event) => DispatchMouseEvent(event);
        canvas.onmousedown = (event) => DispatchMouseEvent(event);
        canvas.onmouseup = (event) => DispatchMouseEvent(event);

        canvas.ontouchstart = supportsPointerEvents ? null : (event) => { event.preventDefault(); DispatchTouchEvent(event); };
        canvas.ontouchmove = supportsPointerEvents ? null : (event) => { event.preventDefault(); DispatchTouchEvent(event); };
        canvas.ontouchend = supportsPointerEvents ? null : (event) => { event.preventDefault(); DispatchTouchEvent(event); };
        canvas.ontouchcancel = supportsPointerEvents ? null : (event) => { event.preventDefault(); DispatchTouchEvent(event); };

        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoved = false;
        let lastTileTap: { x: number; y: number; time: number } = null;

        const isMobileTouch = () => window.matchMedia('(pointer: coarse), (hover: none)').matches;

        const onTouchStart = (event: TouchEvent) =>
        {
            const touch = event.touches[0];

            if(!touch || !isMobileTouch()) return;

            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchMoved = false;
        };

        const onTouchMove = (event: TouchEvent) =>
        {
            const touch = event.touches[0];

            if(!touch || !isMobileTouch()) return;

            if(Math.abs(touch.clientX - touchStartX) > 8 || Math.abs(touch.clientY - touchStartY) > 8) touchMoved = true;
        };

        const onTouchEnd = (event: TouchEvent) =>
        {
            const touch = event.changedTouches[0];

            if(!touch || touchMoved || !isMobileTouch()) return;

            lastTileTap = { x: touch.clientX, y: touch.clientY, time: Date.now() };
        };

        const registerTapFeedback = (x: number, y: number) =>
        {
            lastTileTap = { x, y, time: Date.now() };
        };

        const showTouchFeedback = () =>
        {
            if(!lastTileTap || ((Date.now() - lastTileTap.time) > 250)) return;

            const feedback = document.createElement('div');

            feedback.className = 'nitro-room-touch-feedback';
            feedback.style.left = `${ lastTileTap.x }px`;
            feedback.style.top = `${ lastTileTap.y }px`;

            document.body.appendChild(feedback);
            window.setTimeout(() => feedback.remove(), 420);

            lastTileTap = null;
        };

        const onTileClick = (event: RoomObjectMouseEvent) =>
        {
            if(event instanceof RoomObjectTileMouseEvent) window.setTimeout(showTouchFeedback, 0);
        };

        if(supportsPointerEvents)
        {
            let pointerStartX = 0;
            let pointerStartY = 0;
            let pointerMoved = false;

            const dispatchPointerMouse = (type: string, event: PointerEvent) =>
            {
                DispatchMouseEvent(new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    buttons: ((type === MouseEventType.MOUSE_DOWN) || (type === MouseEventType.MOUSE_MOVE)) ? 1 : 0,
                    altKey: event.altKey,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    button: 0
                }));
            };

            canvas.onpointerdown = (event) =>
            {
                event.preventDefault();
                pointerStartX = event.clientX;
                pointerStartY = event.clientY;
                pointerMoved = false;

                if(canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
                dispatchPointerMouse(MouseEventType.MOUSE_DOWN, event);
            };

            canvas.onpointermove = (event) =>
            {
                event.preventDefault();

                if(Math.abs(event.clientX - pointerStartX) > 8 || Math.abs(event.clientY - pointerStartY) > 8) pointerMoved = true;

                dispatchPointerMouse(MouseEventType.MOUSE_MOVE, event);
            };

            canvas.onpointerup = (event) =>
            {
                event.preventDefault();

                try
                {
                    if(canvas.releasePointerCapture) canvas.releasePointerCapture(event.pointerId);
                }
                catch(err)
                {
                    // Ignore capture release failures
                }

                dispatchPointerMouse(MouseEventType.MOUSE_UP, event);

                if(!pointerMoved)
                {
                    registerTapFeedback(event.clientX, event.clientY);
                    dispatchPointerMouse(MouseEventType.MOUSE_CLICK, event);
                }
            };

            canvas.onpointercancel = (event) =>
            {
                event.preventDefault();

                try
                {
                    if(canvas.releasePointerCapture) canvas.releasePointerCapture(event.pointerId);
                }
                catch(err)
                {
                    // Ignore capture release failures
                }

                dispatchPointerMouse(MouseEventType.MOUSE_UP, event);
            };
        }
        else
        {
            canvas.addEventListener('touchstart', onTouchStart, { passive: false });
            canvas.addEventListener('touchmove', onTouchMove, { passive: false });
            canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        }
        GetEventDispatcher().addEventListener(RoomObjectMouseEvent.CLICK, onTileClick);

        const element = elementRef.current;

        if(!element) return;

        canvas.classList.add('bg-black');

        element.appendChild(canvas);

        return () =>
        {
            canvas.onpointerdown = null;
            canvas.onpointermove = null;
            canvas.onpointerup = null;
            canvas.onpointercancel = null;

            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            GetEventDispatcher().removeEventListener(RoomObjectMouseEvent.CLICK, onTileClick);
        };
    }, [roomSession]);

    return (
        <AnimatePresence>
            {
                <motion.div
                    className="w-full h-full"
                    initial={ { opacity: 0 }}
                    animate={ { opacity: 1 }}
                    exit={ { opacity: 0 }}>
                    <div ref={ elementRef } className="w-full h-full">
                        { roomSession instanceof RoomSession &&
                            <>
                                <RoomWidgetsView />
                                { roomSession.isSpectator && <RoomSpectatorView /> }
                            </> }
                    </div>
                </motion.div> }
        </AnimatePresence>
    );
};
