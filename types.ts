import React from 'react';

export type JointConfig = {
    id: number;
    name: string;
    min: number;
    max: number;
    axis: 'x' | 'y' | 'z';
    defaultValue: number;
    speed: number;
};

export type CameraView = 'ORBIT' | 'TOP' | 'SHOULDER' | 'MID_ARM' | 'WRIST' | 'GRIPPER';

export interface RobotState {
    joints: number[]; // 7 angles
    gripper: number; // 0 to 1 (closed to open)
}

export interface RobotDimensions {
    baseHeight: number; // Base to J1
    j1j2: number;      // J1 to J2
    j2j3: number;      // J2 to J3
    j3j4: number;      // J3 to J4
    j4j5: number;      // J4 to J5
    j5j6: number;      // J5 to J6
    j6j7: number;      // J6 to J7 (Wrist)
    j7tip: number;     // J7 to Tip
}

// Initial Default Config
export const DEFAULT_JOINTS: JointConfig[] = [
    { id: 0, name: "J1: Base Yaw", min: -Math.PI, max: Math.PI, axis: 'y', defaultValue: 0, speed: 0.02 },
    { id: 1, name: "J2: Shoulder Pitch", min: -Math.PI / 2, max: Math.PI / 2, axis: 'x', defaultValue: 0, speed: 0.02 },
    { id: 2, name: "J3: Arm Yaw 1", min: -Math.PI / 1.5, max: Math.PI / 1.5, axis: 'y', defaultValue: 0, speed: 0.03 },
    { id: 3, name: "J4: Arm Yaw 2", min: -Math.PI / 1.5, max: Math.PI / 1.5, axis: 'y', defaultValue: 0, speed: 0.03 },
    { id: 4, name: "J5: Arm Yaw 3", min: -Math.PI / 1.5, max: Math.PI / 1.5, axis: 'y', defaultValue: 0, speed: 0.03 },
    { id: 5, name: "J6: Wrist Pitch", min: -Math.PI / 1.2, max: Math.PI / 1.2, axis: 'x', defaultValue: Math.PI / 4, speed: 0.04 },
    { id: 6, name: "J7: Wrist Roll", min: -Math.PI * 2, max: Math.PI * 2, axis: 'z', defaultValue: 0, speed: 0.05 },
];

export const DEFAULT_DIMENSIONS: RobotDimensions = {
    baseHeight: 0.2,
    j1j2: 0.3,
    j2j3: 0.8,
    j3j4: 0.6,
    j4j5: 0.6,
    j5j6: 0.5,
    j6j7: 0.3,
    j7tip: 0.2
};

// Augment global JSX namespace to include React Three Fiber elements
declare global {
    namespace JSX {
        interface IntrinsicElements {
            group: any;
            mesh: any;
            cylinderGeometry: any;
            boxGeometry: any;
            meshStandardMaterial: any;
            meshBasicMaterial: any;
            pointLight: any;
            ambientLight: any;
            spotLight: any;
            points: any;
            bufferGeometry: any;
            bufferAttribute: any;
            pointsMaterial: any;
            planeGeometry: any;
            axesHelper: any;
            ringGeometry: any;
            [elemName: string]: any;
        }
    }
}