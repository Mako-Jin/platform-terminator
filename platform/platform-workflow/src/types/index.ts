import * as THREE from 'three';

// ============ 节点类型 ============
export type NodeType =
    | 'StartEvent'
    | 'EndEvent'
    | 'UserTask'
    | 'ServiceTask'
    | 'ScriptTask'
    | 'ManualTask'
    | 'BusinessRuleTask'
    | 'SendTask'
    | 'ReceiveTask'
    | 'SubProcess'
    | 'Gateway'
    | 'ExclusiveGateway'
    | 'ParallelGateway'
    | 'InclusiveGateway';

export type NodeStatus = 'idle' | 'active' | 'completed' | 'error' | 'waiting';

export interface NodeProperties {
    label?: string;
    description?: string;
    hasWorker?: boolean;
    workerLevel?: 'junior' | 'senior' | 'lead' | 'manager';
    assignee?: string;
    dueDate?: string;
    priority?: number;
    [key: string]: unknown;
}

export interface NodeData {
    id: string;
    type: NodeType;
    x: number;
    y: number;
    width: number;
    height: number;
    status?: NodeStatus;
    properties?: NodeProperties;
}

// ============ 连线类型 ============
export interface Waypoint {
    x: number;
    y: number;
    z?: number;
}

export interface EdgeData {
    id: string;
    from: string;
    to: string;
    waypoints?: Waypoint[];
    label?: string;
    condition?: string;
}

// ============ 流程 Schema ============
export interface ProcessSchema {
    processId: string;
    processName: string;
    nodes: NodeData[];
    edges: EdgeData[];
    version?: string;
    created?: string;
    modified?: string;
}

// ============ 流程实例 ============
export interface ProcessInstance {
    id: string;
    processId: string;
    status: 'running' | 'completed' | 'terminated' | 'suspended';
    variables: Record<string, unknown>;
    startTime: Date;
    endTime?: Date;
    currentNodeId?: string;
    history: ProcessHistoryItem[];
}

export interface ProcessHistoryItem {
    nodeId: string;
    nodeType: NodeType;
    timestamp: Date;
    action: 'enter' | 'exit' | 'complete';
    userId?: string;
}

// ============ 任务 ============
export interface Task {
    id: string;
    processInstanceId: string;
    nodeId: string;
    name: string;
    assignee?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'delegated';
    priority: number;
    created: Date;
    due?: Date;
    completed?: Date;
    variables: Record<string, unknown>;
}

// ============ 小人物 ============
export interface WorkerConfig {
    taskType: NodeType;
    level?: 'junior' | 'senior' | 'lead' | 'manager';
    special?: 'inspector' | 'security' | 'default';
}

export interface WorkerData {
    id: string;
    type: NodeType;
    level: string;
    hatColor: string;
    bodyColor: string;
    position: THREE.Vector3;
}

// ============ 渲染配置 ============
export interface RenderOptions {
    container: HTMLElement;
    enableWorkers?: boolean;
    enableAnimations?: boolean;
    nodeScale?: number;
    onNodeClick?: (node: NodeData) => void;
    onNodeHover?: (node: NodeData | null) => void;
    onEdgeClick?: (edge: EdgeData) => void;
}

export interface AnimationOptions {
    floating?: {
        amplitude?: number;
        speed?: number;
        enabled?: boolean;
    };
    mining?: {
        speed?: number;
        intensity?: number;
        enabled?: boolean;
    };
    transition?: {
        duration?: number;
        enabled?: boolean;
    };
}

// ============ 事件类型 ============
export type WorkflowEvent =
    | { type: 'processLoaded'; data: ProcessSchema }
    | { type: 'processStarted'; data: ProcessInstance }
    | { type: 'processCompleted'; data: ProcessInstance }
    | { type: 'nodeEntered'; data: NodeData }
    | { type: 'nodeExited'; data: NodeData }
    | { type: 'taskCompleted'; data: { taskId: string; result: unknown } }
    | { type: 'error'; data: Error };

export type WorkflowEventListener = (event: WorkflowEvent) => void;

// ============ Parser 相关 ============
export type DataFormat = 'xml' | 'bpmn' | 'json';

export interface Parser {
    parse(data: string | object): Promise<ProcessSchema>;
    validate(data: string | object): boolean;
}

// ============ 配置类型 ============
export interface HatConfig {
    color: string;
    name: string;
    description?: string;
}

export interface NodeStyleConfig {
    color: number;
    borderColor: number;
    textColor: number;
    width: number;
    height: number;
    shape: 'rectangle' | 'circle' | 'diamond' | 'rounded-rect';
}