import { LocalizeText } from './LocalizeText';

const allowedColours: Map<string, string> = new Map();

allowedColours.set('r', 'red');
allowedColours.set('b', 'blue');
allowedColours.set('g', 'green');
allowedColours.set('y', 'yellow');
allowedColours.set('w', 'white');
allowedColours.set('o', 'orange');
allowedColours.set('c', 'cyan');
allowedColours.set('br', 'brown');
allowedColours.set('pr', 'purple');
allowedColours.set('pk', 'pink');

allowedColours.set('red', 'red');
allowedColours.set('blue', 'blue');
allowedColours.set('green', 'green');
allowedColours.set('yellow', 'yellow');
allowedColours.set('white', 'white');
allowedColours.set('orange', 'orange');
allowedColours.set('cyan', 'cyan');
allowedColours.set('brown', 'brown');
allowedColours.set('purple', 'purple');
allowedColours.set('pink', 'pink');

const encodeHTML = (str: string) =>
{
    return str.replace(/([\u00A0-\u9999<>&])(.|$)/g, (full, char, next) =>
    {
        if(char !== '&' || next !== '#')
        {
            if(/[\u00A0-\u9999<>&]/.test(next)) next = '&#' + next.charCodeAt(0) + ';';

            return '&#' + char.charCodeAt(0) + ';' + next;
        }

        return full;
    });
};

const formatTag = (content: string, tag: string, replacement: (value: string) => string) =>
{
    const pattern = new RegExp(`\\[${ tag }\\]([\\s\\S]*?)\\[\\/${ tag }\\]`, 'gi');
    let previous = '';
    let next = content;
    let guard = 0;

    while((previous !== next) && (guard < 20))
    {
        previous = next;
        next = next.replace(pattern, (match, value) => replacement(value));
        guard++;
    }

    return next;
};

const applyWiredTextMarkup = (content: string) =>
{
    const colorStyles: Record<string, string> = {
        green: '#008000',
        cyan: '#008b8b',
        red: '#d60000',
        blue: '#005dff',
        purple: '#7d31b8'
    };

    let result = content;

    result = formatTag(result, 'b', value => `<strong>${ value }</strong>`);
    result = formatTag(result, 'i', value => `<em>${ value }</em>`);
    result = formatTag(result, 'u', value => `<u>${ value }</u>`);

    Object.entries(colorStyles).forEach(([ tag, color ]) =>
    {
        result = formatTag(result, tag, value => `<span style="color:${ color }">${ value }</span>`);
    });

    return result;
};

export const RoomChatFormatter = (content: string) =>
{
    let result = '';

    content = encodeHTML(content);
    content = applyWiredTextMarkup(content);
    //content = (joypixels.shortnameToUnicode(content) as string)

    if(content.startsWith('@') && content.indexOf('@', 1) > -1)
    {
        let match = null;

        while((match = /@[a-zA-Z]+@/g.exec(content)) !== null)
        {
            const colorTag = match[0].toString();
            const colorName = colorTag.substr(1, colorTag.length - 2);
            const text = content.replace(colorTag, '');

            if(!allowedColours.has(colorName))
            {
                result = text;
            }
            else
            {
                const color = allowedColours.get(colorName);
                result = '<span style="color: ' + color + '">' + text + '</span>';
            }
            break;
        }
    }
    else
    {
        result = content;
    }

    return result.replace(/\r\n|\r|\n/g, '<br />');
};
