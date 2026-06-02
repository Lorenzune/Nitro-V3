import { GetRoomEngine, MouseEventType, TouchEventType } from '@nitrots/nitro-renderer';

let didMouseMove = false;
let lastClick = 0;
let clickCount = 0;

export const DispatchTouchEvent = (event: TouchEvent, canvasId: number = 1, longTouch: boolean = false, altKey: boolean = false, ctrlKey: boolean = false, shiftKey: boolean = false) =>
{
    let x = 0;
    let y = 0;
    let clickEventType: string = null;

    if(event.touches[0])
    {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    }

    else if(event.changedTouches[0])
    {
        x = event.changedTouches[0].clientX;
        y = event.changedTouches[0].clientY;
    }

    let eventType = event.type;
    const buttonDown = (eventType === TouchEventType.TOUCH_START) || (eventType === TouchEventType.TOUCH_MOVE) || (eventType === TouchEventType.TOUCH_LONG);

    if(longTouch) eventType = TouchEventType.TOUCH_LONG;

    switch(eventType)
    {
        case TouchEventType.TOUCH_START:
            eventType = MouseEventType.MOUSE_DOWN;

            didMouseMove = false;
            break;
        case TouchEventType.TOUCH_MOVE:
            eventType = MouseEventType.MOUSE_MOVE;

            didMouseMove = true;
            break;
        case TouchEventType.TOUCH_END:
            eventType = MouseEventType.MOUSE_UP;

            if(!didMouseMove)
            {
                clickEventType = MouseEventType.MOUSE_CLICK;

                if(lastClick)
                {
                    clickCount = 1;

                    if(lastClick >= (Date.now() - 300)) clickCount++;
                }

                lastClick = Date.now();

                if(clickCount === 2)
                {
                    clickEventType = MouseEventType.DOUBLE_CLICK;
                    clickCount = 0;
                    lastClick = null;
                }
            }
            break;
        case TouchEventType.TOUCH_LONG:
            eventType = MouseEventType.MOUSE_DOWN_LONG;
            break;
        default: return;
    }

    GetRoomEngine().dispatchMouseEvent(canvasId, x, y, eventType, altKey, ctrlKey, shiftKey, buttonDown);

    if(clickEventType) GetRoomEngine().dispatchMouseEvent(canvasId, x, y, clickEventType, altKey, ctrlKey, shiftKey, false);
};
