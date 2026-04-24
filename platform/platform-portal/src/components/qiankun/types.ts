import type { MicroApp } from 'qiankun';

export interface MicroAppProps {
    basename: string;
    getGlobalState: () => Record<string, any>;
    setGlobalState: (state: Partial<Record<string, any>>) => void;
    onGlobalStateChange: (
        callback: (state: Record<string, any>, prev: Record<string, any>) => void,
        fireImmediately?: boolean
    ) => void;
}

export interface MicroAppConfig {
    name: string;
    entry: string;
    container: string;
    activeRule: string;
    props: MicroAppProps;
}

export interface LifecycleHooks {
    beforeLoad?: (app: MicroApp) => Promise<void>;
    beforeMount?: (app: MicroApp) => Promise<void>;
    afterMount?: (app: MicroApp) => Promise<void>;
    beforeUnmount?: (app: MicroApp) => Promise<void>;
    afterUnmount?: (app: MicroApp) => Promise<void>;
    loadError?: (err: Error, app: MicroApp) => void;
}

export interface QiankunStartOptions {
    prefetch?: boolean | 'all' | Array<string>;
    sandbox?: {
        experimentalStyleIsolation?: boolean;
        strictStyleIsolation?: boolean;
    };
    singular?: boolean;
}
