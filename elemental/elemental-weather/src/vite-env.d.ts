/// <reference types="vite/client" />

declare module '*.glsl' {
    const value: string
    export default value
}

declare module '*.vert' {
    const value: string
    export default value
}

declare module '*.frag' {
    const value: string
    export default value
}

declare module '*.module.css' {
    const classes: { readonly [key: string]: string }
    export default classes
}

declare module '*.module.scss' {
    const classes: { readonly [key: string]: string }
    export default classes
}

declare module '*.png' {
    const value: string
    export default value
}

declare module '*.jpg' {
    const value: string
    export default value
}

declare module '*.jpeg' {
    const value: string
    export default value
}

declare module '*.gif' {
    const value: string
    export default value
}

declare module '*.svg' {
    const value: string
    export default value
}

declare module '*.mp3' {
    const value: string
    export default value
}

declare module '*.glb' {
    const value: string
    export default value
}

interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string
    readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
