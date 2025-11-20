import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, PerspectiveCamera, Text, TransformControls } from '@react-three/drei';
import { Robot } from './Robot';
import { CameraView, RobotDimensions, JointConfig } from '../types';
import { FLOOR_COLOR, GRID_COLOR, ACCENT_COLOR } from '../constants';
import { Vector3, Group } from 'three';

interface SceneProps {
    jointValues: number[];
    gripperValue: number;
    activeView: CameraView;
    fov: number;
    ikMode: boolean;
    ikTarget: [number, number, number];
    dimensions: RobotDimensions;
    workspacePoints: Float32Array;
    workspaceVersion: number;
    onTargetDrag: (newPos: Vector3) => void;
    jointsConfig: JointConfig[];
    isColliding: boolean;
    cameraOffset: { pitch: number, yaw: number };
}

const Dumbbell = () => {
    // Dimensions: Total Length 0.3m. 
    // Middle Handle: Diameter 0.15m (Radius 0.075). Length approx 0.1m? 
    // Weights: Remaining length (0.1m each side). Diameter bigger?
    // The prompt says "Middle part 15cm diameter". 
    // Previous prompt said weights are 2x handle. If Handle is 0.15m dia, weights are 0.3m dia.
    // This is a very chunky object.
    
    const handleRadius = 0.075; // 15cm diameter
    const weightRadius = 0.12;  // Slightly larger for visual distinction
    const totalLength = 0.3;
    const weightLength = 0.08;
    const handleLength = totalLength - (weightLength * 2);

    return (
        <group>
             {/* Handle */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[handleRadius, handleRadius, handleLength, 32]} />
                <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Left Weight */}
            <mesh position={[-(handleLength/2 + weightLength/2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[weightRadius, weightRadius, weightLength, 32]} />
                <meshStandardMaterial color="#111" metalness={0.2} roughness={0.8} />
            </mesh>
            {/* Right Weight */}
            <mesh position={[(handleLength/2 + weightLength/2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[weightRadius, weightRadius, weightLength, 32]} />
                <meshStandardMaterial color="#111" metalness={0.2} roughness={0.8} />
            </mesh>
            {/* Glow Effect */}
            <pointLight intensity={0.5} distance={2} color={ACCENT_COLOR} />
        </group>
    );
}

const TargetController = ({ position, onDrag, visible }: { position: [number, number, number], onDrag: (v: Vector3) => void, visible: boolean }) => {
    const ref = useRef<Group>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Sync the object position with the prop (controlled by Gamepad/App state)
    // BUT ONLY when we are NOT dragging with the mouse.
    // This prevents the "fighting" that causes the drag to cancel or stutter.
    useFrame(() => {
        if (ref.current && !isDragging) {
            ref.current.position.set(position[0], position[1], position[2]);
        }
    });

    return (
        <>
            <group ref={ref}>
                <Dumbbell />
            </group>
            {visible && (
                <TransformControls
                    object={ref}
                    mode="translate"
                    size={0.75}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onObjectChange={(e: any) => {
                        if (onDrag && e?.target?.object) {
                            onDrag(e.target.object.position);
                        }
                    }}
                />
            )}
        </>
    );
};

const WorkspaceVisualizer = ({ points, version }: { points: Float32Array, version: number }) => {
    if (points.length === 0) return null;
    
    return (
        <points key={version}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={points.length / 3}
                    array={points}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.03}
                color={ACCENT_COLOR}
                transparent
                opacity={0.4}
                sizeAttenuation={true}
            />
        </points>
    )
}

const Ruler = () => {
    const ticks = [];
    const height = 4;
    
    for(let i=0; i<=height * 10; i++) {
        const y = i / 10;
        const isMajor = i % 5 === 0;
        const width = isMajor ? 0.2 : 0.1;
        const color = isMajor ? "white" : "#666";
        
        ticks.push(
            <group key={i} position={[0, y, 0]}>
                <mesh position={[0.15, 0, 0]}>
                    <boxGeometry args={[width, 0.01, 0.01]} />
                    <meshBasicMaterial color={color} />
                </mesh>
                {isMajor && y > 0 && (
                    <Text position={[0.4, 0, 0]} fontSize={0.1} color="white">
                        {y.toFixed(1)}m
                    </Text>
                )}
            </group>
        );
    }

    return (
        <group position={[2, 0, -2]}>
            {/* Pole */}
            <mesh position={[0, height/2, 0]}>
                <cylinderGeometry args={[0.02, 0.02, height, 8]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            {ticks}
            <Text position={[0, height + 0.2, 0]} fontSize={0.15} color="white">Height Ref</Text>
        </group>
    )
}

const CoordinateAxes = () => {
    return (
        <group position={[0, 0.01, 0]}>
             <axesHelper args={[1]} />
             <Text position={[1.1, 0, 0]} fontSize={0.15} color="#ff5555">X</Text>
             <Text position={[0, 1.1, 0]} fontSize={0.15} color="#55ff55">Y</Text>
             <Text position={[0, 0, 1.1]} fontSize={0.15} color="#5555ff">Z</Text>
        </group>
    )
}

const FloorLabels = () => {
    const labels = [];
    for(let i=1; i<=5; i++) {
        labels.push(
            <Text key={`x-${i}`} position={[i, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.15} color="#555">
                {i}m
            </Text>
        );
         labels.push(
            <Text key={`z-${i}`} position={[0, 0.02, i]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.15} color="#555">
                {i}m
            </Text>
        );
    }
    return <group>{labels}</group>;
}

export const Scene: React.FC<SceneProps> = ({ 
    jointValues, 
    gripperValue, 
    activeView, 
    fov, 
    ikMode, 
    ikTarget, 
    dimensions,
    workspacePoints,
    workspaceVersion,
    onTargetDrag,
    jointsConfig,
    isColliding,
    cameraOffset
}) => {
    return (
        <div className="w-full h-full relative bg-gray-900">
            <Canvas shadows dpr={[1, 2]}>
                <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <spotLight 
                        position={[10, 10, 10]} 
                        angle={0.15} 
                        penumbra={1} 
                        intensity={1} 
                        castShadow 
                    />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} />
                    
                    <Environment preset="city" />
                    
                    {activeView === 'ORBIT' && (
                        <OrbitControls makeDefault minDistance={1} maxDistance={20} target={[0, 1, 0]} />
                    )}
                    {activeView === 'ORBIT' && (
                         <PerspectiveCamera makeDefault position={[4, 4, 4]} fov={fov} />
                    )}
                    
                    {activeView === 'TOP' && (
                        <PerspectiveCamera makeDefault position={[0, 8, 0]} rotation={[-Math.PI/2, 0, 0]} fov={fov} />
                    )}

                    <Robot 
                        jointValues={jointValues} 
                        gripperValue={gripperValue} 
                        activeView={activeView} 
                        fov={fov}
                        dimensions={dimensions}
                        jointsConfig={jointsConfig}
                        isColliding={isColliding}
                        cameraOffset={cameraOffset}
                    />

                    <TargetController 
                        position={ikTarget} 
                        onDrag={onTargetDrag} 
                        visible={activeView === 'ORBIT'} 
                    />

                    <WorkspaceVisualizer points={workspacePoints} version={workspaceVersion} />
                    <Ruler />
                    <CoordinateAxes />
                    <FloorLabels />

                    <Grid 
                        position={[0, 0, 0]} 
                        args={[10.5, 10.5]} 
                        cellSize={0.5} 
                        cellThickness={0.5} 
                        cellColor={GRID_COLOR} 
                        sectionSize={3} 
                        sectionThickness={1} 
                        sectionColor="#4b5563" 
                        fadeDistance={30} 
                    />
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                        <planeGeometry args={[50, 50]} />
                        <meshStandardMaterial color={FLOOR_COLOR} />
                    </mesh>
                    <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
                    
                </Suspense>
            </Canvas>
        </div>
    );
};