import { LoggerFactory } from "common-shared";

export interface BushDefinition {
    position: [number, number, number];
    scale?: number;
    leafCount?: number;
    bushType?: 'default' | 'tree' | 'birch';
}

interface BushDefinitionsJSON {
    bushes: BushDefinition[];
}

const logger = LoggerFactory.create("bush-loader");

export async function loadBushDefinitions(): Promise<BushDefinition[]> {
    try {
        const module = await import('/@/settings/bush/bushDefinitions.json');
        const data = module.default as BushDefinitionsJSON;
        
        if (!data.bushes || !Array.isArray(data.bushes)) {
            logger.warn('Invalid bush definitions format');
            return [];
        }
        
        return data.bushes;
    } catch (error) {
        logger.error('Error loading bush definitions:', error);
        return [];
    }
}
