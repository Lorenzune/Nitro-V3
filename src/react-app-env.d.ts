/// <reference types="react-scripts" />
declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.gif' {
    const src: string;
    export default src;
}

interface ImportMeta
{
    glob: (pattern: string, options?: { eager?: boolean; import?: string }) => Record<string, string>;
}
