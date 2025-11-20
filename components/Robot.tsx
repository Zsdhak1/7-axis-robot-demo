import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, DoubleSide } from 'three';
import { PerspectiveCamera, Text } from '@react-three/drei';
import { CameraView, RobotDimensions, JointConfig } from '../types';
import { ROBOT_COLOR, JOINT_COLOR, ACCENT_COLOR } from '../constants';

interface RobotProps {
    jointValues: number[];
    gripperValue: number;
    activeView: CameraView;
    fov: number;
    dimensions: RobotDimensions;
    jointsConfig: JointConfig[];
    isColliding?: boolean;
    cameraOffset: { pitch: number, yaw: number };
}

const RobotPart = ({ 
    children, 
    position = [0, 0, 0], 
    rotation = [0, 0, 0], 
    color = ROBOT_COLOR, 
    scale = [1, 1, 1],
    geometryType = "box",
    isColliding = false
}: any) => (
    <group position={position as any} rotation={rotation as any}>
        <mesh castShadow receiveShadow scale={scale as any}>
            {geometryType === "cylinder" ? (
                <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
            ) : (
                <boxGeometry args={[1, 1, 1]} />
            )}
            <meshStandardMaterial color={isColliding ? "#ef4444" : color} roughness={0.3} metalness={0.6} />
        </mesh>
        {children}
    </group>
);

const JointMesh = ({ rotation = [Math.PI / 2, 0, 0] }: { rotation?: [number, number, number] }) => (
    <mesh rotation={rotation as any}>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 16]} />
        <meshStandardMaterial color={JOINT_COLOR} metalness={0.5} roughness={0.5} />
    </mesh>
);

const LimitVisualizer = ({ config, currentAngle }: { config: JointConfig, currentAngle: number }) => {
    const range = config.max - config.min;
    const startAngle = config.min;
    
    let rotation: [number, number, number] = [0, 0, 0];
    if (config.axis === 'x') rotation = [0, Math.PI / 2, 0];
    if (config.axis === 'y') rotation = [-Math.PI / 2, 0, 0];
    if (config.axis === 'z') rotation = [0, 0, 0];

    // Check limits
    const isNearMin = Math.abs(currentAngle - config.min) < 0.08;
    const isNearMax = Math.abs(currentAngle - config.max) < 0.08;
    const isWarning = isNearMin || isNearMax;

    // Increased scale for better visibility
    const innerR = 0.25;
    const outerR = 0.35;

    return (
        <group rotation={rotation as any}>
             {/* Background Sector (Safe Range) */}
            <mesh rotation={[0, 0, startAngle]}>
                <ringGeometry args={[innerR, outerR, 32, 1, 0, range]} />
                <meshBasicMaterial 
                    color={isWarning ? "#ef4444" : "#0ea5e9"} 
                    opacity={isWarning ? 0.8 : 0.4} 
                    transparent 
                    side={DoubleSide} 
                    depthTest={false} // Always show on top slightly if clipped
                />
            </mesh>
            
            {/* Border Lines for crisp definition */}
            <mesh rotation={[0, 0, startAngle]}>
                <ringGeometry args={[innerR, innerR + 0.015, 32, 1, 0, range]} />
                <meshBasicMaterial color="white" opacity={0.9} transparent side={DoubleSide} />
            </mesh>
            <mesh rotation={[0, 0, startAngle]}>
                <ringGeometry args={[outerR - 0.015, outerR, 32, 1, 0, range]} />
                <meshBasicMaterial color="white" opacity={0.9} transparent side={DoubleSide} />
            </mesh>

            {/* Min Limit Stop (Solid Block) */}
            <mesh rotation={[0, 0, config.min]}>
                <mesh position={[(innerR+outerR)/2, 0, 0]}>
                    <boxGeometry args={[outerR - innerR + 0.08, 0.08, 0.04]} />
                    <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.6} />
                </mesh>
            </mesh>
            
            {/* Max Limit Stop (Solid Block) */}
             <mesh rotation={[0, 0, config.max]}>
                <mesh position={[(innerR+outerR)/2, 0, 0]}>
                    <boxGeometry args={[outerR - innerR + 0.08, 0.08, 0.04]} />
                    <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.6} />
                </mesh>
            </mesh>

            {/* Current Pointer (Yellow Arrow) */}
            <group rotation={[0, 0, currentAngle]}>
                 <mesh position={[outerR + 0.08, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                    <coneGeometry args={[0.06, 0.15, 8]} /> 
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
                 </mesh>
                 <mesh position={[(innerR+outerR)/2, 0, 0]}>
                    <boxGeometry args={[outerR-innerR, 0.03, 0.03]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
                 </mesh>
            </group>
        </group>
    );
};

export const Robot: React.FC<RobotProps> = ({ jointValues, gripperValue, activeView, fov, dimensions, jointsConfig, isColliding, cameraOffset }) => {
    const groupRef = useRef<Group>(null);
    
    const j1Ref = useRef<Group>(null);
    const j2Ref = useRef<Group>(null);
    const j3Ref = useRef<Group>(null);
    const j4Ref = useRef<Group>(null);
    const j5Ref = useRef<Group>(null);
    const j6Ref = useRef<Group>(null);
    const j7Ref = useRef<Group>(null);
    
    const leftFingerRef = useRef<Mesh>(null);
    const rightFingerRef = useRef<Mesh>(null);

    // Camera rotation logic
    const camRotX = cameraOffset.pitch * (Math.PI / 180);
    const camRotY = cameraOffset.yaw * (Math.PI / 180);

    useFrame(() => {
        if (j1Ref.current) j1Ref.current.rotation.y = jointValues[0];
        if (j2Ref.current) j2Ref.current.rotation.x = jointValues[1];
        if (j3Ref.current) j3Ref.current.rotation.y = jointValues[2];
        if (j4Ref.current) j4Ref.current.rotation.y = jointValues[3];
        if (j5Ref.current) j5Ref.current.rotation.y = jointValues[4];
        if (j6Ref.current) j6Ref.current.rotation.x = jointValues[5];
        if (j7Ref.current) j7Ref.current.rotation.z = jointValues[6];

        if (leftFingerRef.current && rightFingerRef.current) {
            const offset = 0.05 + (gripperValue * 0.15);
            leftFingerRef.current.position.x = -offset;
            rightFingerRef.current.position.x = offset;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            {/* Base Fixed */}
            <RobotPart geometryType="cylinder" scale={[0.6, 0.2, 0.6]} position={[0, 0.1, 0]} color="#374151" isColliding={isColliding} />

            {/* J1: Base Yaw (Y) */}
            <group position={[0, dimensions.baseHeight, 0]}>
                <LimitVisualizer config={jointsConfig[0]} currentAngle={jointValues[0]} />
                <group ref={j1Ref}>
                    <RobotPart geometryType="cylinder" scale={[0.4, 0.4, 0.4]} position={[0, 0.2, 0]} isColliding={isColliding} />
                    
                    {/* J2: Shoulder Pitch (X) */}
                    <group position={[0, dimensions.j1j2, 0]}>
                        <LimitVisualizer config={jointsConfig[1]} currentAngle={jointValues[1]} />
                        <group ref={j2Ref}>
                            <JointMesh />
                            {/* Arm Segment J2-J3 */}
                            <RobotPart scale={[0.3, 0.3, dimensions.j2j3]} position={[0, 0, dimensions.j2j3 / 2]} color={ACCENT_COLOR} isColliding={isColliding}>
                                <Text fontSize={0.2} color="white" position={[0.6, 0, 0]} rotation={[0, Math.PI/2, 0]}>L1</Text>
                            </RobotPart>
                            
                            <PerspectiveCamera 
                                makeDefault={activeView === 'SHOULDER'} 
                                position={[0, 0.3, 0.1]} 
                                rotation={[camRotX, Math.PI + camRotY, 0]}
                                fov={fov}
                                near={0.1}
                                far={50}
                            />

                            {/* J3: Arm Yaw 1 (Y) */}
                            <group position={[0, 0, dimensions.j2j3]}>
                                <LimitVisualizer config={jointsConfig[2]} currentAngle={jointValues[2]} />
                                <group ref={j3Ref}>
                                    <JointMesh rotation={[0, 0, 0]} /> 
                                    {/* Arm Segment J3-J4 */}
                                    <RobotPart scale={[0.25, 0.25, dimensions.j3j4]} position={[0, 0, dimensions.j3j4 / 2]} color={ROBOT_COLOR} isColliding={isColliding} />

                                    {/* J4: Arm Yaw 2 (Y) */}
                                    <group position={[0, 0, dimensions.j3j4]}>
                                        <LimitVisualizer config={jointsConfig[3]} currentAngle={jointValues[3]} />
                                        <group ref={j4Ref}>
                                            <JointMesh rotation={[0, 0, 0]} />
                                            {/* Arm Segment J4-J5 */}
                                            <RobotPart scale={[0.25, 0.25, dimensions.j4j5]} position={[0, 0, dimensions.j4j5 / 2]} color={ACCENT_COLOR} isColliding={isColliding} />
                                            
                                            <PerspectiveCamera 
                                                makeDefault={activeView === 'MID_ARM'} 
                                                position={[0, 0.2, 0]} 
                                                rotation={[camRotX, Math.PI + camRotY, 0]}
                                                fov={fov}
                                                near={0.1}
                                                far={50}
                                            />

                                            {/* J5: Arm Yaw 3 (Y) */}
                                            <group position={[0, 0, dimensions.j4j5]}>
                                                <LimitVisualizer config={jointsConfig[4]} currentAngle={jointValues[4]} />
                                                <group ref={j5Ref}>
                                                    <JointMesh rotation={[0, 0, 0]} />
                                                    {/* Arm Segment J5-J6 */}
                                                    <RobotPart scale={[0.2, 0.2, dimensions.j5j6]} position={[0, 0, dimensions.j5j6 / 2]} color={ROBOT_COLOR} isColliding={isColliding} />

                                                    {/* J6: Wrist Pitch (X) */}
                                                    <group position={[0, 0, dimensions.j5j6]}>
                                                        <LimitVisualizer config={jointsConfig[5]} currentAngle={jointValues[5]} />
                                                        <group ref={j6Ref}>
                                                            <JointMesh />
                                                            {/* Wrist Segment J6-J7 */}
                                                            <RobotPart scale={[0.15, 0.15, dimensions.j6j7]} position={[0, 0, dimensions.j6j7 / 2]} isColliding={isColliding} />

                                                            <PerspectiveCamera 
                                                                makeDefault={activeView === 'WRIST'} 
                                                                position={[0, 0.15, 0]} 
                                                                rotation={[camRotX, Math.PI + camRotY, 0]}
                                                                fov={fov}
                                                                near={0.05}
                                                                far={20}
                                                            />
                                                            
                                                            {/* J7: Wrist Roll (Z) */}
                                                            <group position={[0, 0, dimensions.j6j7]}>
                                                                <LimitVisualizer config={jointsConfig[6]} currentAngle={jointValues[6]} />
                                                                <group ref={j7Ref}>
                                                                    <RobotPart geometryType="cylinder" scale={[0.15, 0.1, 0.15]} position={[0, 0, 0.05]} rotation={[Math.PI/2, 0, 0]} color="#222" isColliding={isColliding} />
                                                                    
                                                                    {/* Gripper Assembly */}
                                                                    <group position={[0, 0, dimensions.j7tip / 2]} rotation={[Math.PI/2, 0, 0]}>
                                                                        <mesh position={[0, 0.05, 0]}>
                                                                            <boxGeometry args={[0.4, 0.1, 0.1]} />
                                                                            <meshStandardMaterial color="#333" />
                                                                        </mesh>
                                                                        
                                                                        <mesh ref={leftFingerRef} position={[-0.1, 0.2, 0]}>
                                                                            <boxGeometry args={[0.05, 0.3, 0.05]} />
                                                                            <meshStandardMaterial color="#666" />
                                                                        </mesh>
                                                                        <mesh ref={rightFingerRef} position={[0.1, 0.2, 0]}>
                                                                            <boxGeometry args={[0.05, 0.3, 0.05]} />
                                                                            <meshStandardMaterial color="#666" />
                                                                        </mesh>

                                                                        <PerspectiveCamera 
                                                                            makeDefault={activeView === 'GRIPPER'} 
                                                                            position={[0, 0.05, 0.05]} 
                                                                            rotation={[Math.PI/2 + camRotX, camRotY, 0]}
                                                                            fov={fov}
                                                                            near={0.01}
                                                                            far={20}
                                                                        />
                                                                    </group>
                                                                </group>
                                                            </group>
                                                        </group>
                                                    </group>
                                                </group>
                                            </group>
                                        </group>
                                    </group>
                                </group>
                            </group>
                        </group>
                    </group>
                </group>
            </group>
        </group>
    );
};