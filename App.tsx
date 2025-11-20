import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Vector3, Matrix4 } from 'three';
import { Scene } from './components/Scene';
import { Overlay } from './components/Overlay';
import { DEFAULT_JOINTS, CameraView, RobotDimensions, DEFAULT_DIMENSIONS, JointConfig } from './types';
import { COLLISION_WARNING_THRESHOLD, FLOOR_LIMIT } from './constants';

// Axes of rotation for each joint (Local space)
const JOINT_AXES = [
    new Vector3(0, 1, 0), // J1: Y
    new Vector3(1, 0, 0), // J2: X
    new Vector3(0, 1, 0), // J3: Y
    new Vector3(0, 1, 0), // J4: Y
    new Vector3(0, 1, 0), // J5: Y
    new Vector3(1, 0, 0), // J6: X
    new Vector3(0, 0, 1)  // J7: Z
];

// Helper: Get bone offsets based on dimensions
const getBoneOffsets = (dims: RobotDimensions) => [
    new Vector3(0, dims.baseHeight, 0), // Base to J1
    new Vector3(0, dims.j1j2, 0),       // J1 to J2
    new Vector3(0, 0, dims.j2j3),       // J2 to J3
    new Vector3(0, 0, dims.j3j4),       // J3 to J4
    new Vector3(0, 0, dims.j4j5),       // J4 to J5
    new Vector3(0, 0, dims.j5j6),       // J5 to J6
    new Vector3(0, 0, dims.j6j7),       // J6 to J7
    new Vector3(0, 0, dims.j7tip)       // J7 to Tip
];

// Helper: Forward Kinematics (Pure Function)
const computeFK = (angles: number[], dims: RobotDimensions) => {
    const boneOffsets = getBoneOffsets(dims);
    let currentMatrix = new Matrix4();
    const jointPositions: Vector3[] = [];
    
    // Apply Base Offset
    currentMatrix.multiply(new Matrix4().makeTranslation(boneOffsets[0].x, boneOffsets[0].y, boneOffsets[0].z));
    jointPositions.push(new Vector3().setFromMatrixPosition(currentMatrix));

    for (let i = 0; i < 7; i++) {
        const rotationMatrix = new Matrix4();
        if (JOINT_AXES[i].x === 1) rotationMatrix.makeRotationX(angles[i]);
        else if (JOINT_AXES[i].y === 1) rotationMatrix.makeRotationY(angles[i]);
        else rotationMatrix.makeRotationZ(angles[i]);
        
        currentMatrix.multiply(rotationMatrix);
        
        const offset = boneOffsets[i + 1];
        currentMatrix.multiply(new Matrix4().makeTranslation(offset.x, offset.y, offset.z));
        
        jointPositions.push(new Vector3().setFromMatrixPosition(currentMatrix));
    }
    return jointPositions;
};

// Helper: Shortest distance between two line segments P1-Q1 and P2-Q2
const distSegmentToSegment = (p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3) => {
    const u = new Vector3().subVectors(q1, p1);
    const v = new Vector3().subVectors(q2, p2);
    const w = new Vector3().subVectors(p1, p2);
    const a = u.dot(u);
    const b = u.dot(v);
    const c = v.dot(v);
    const d = u.dot(w);
    const e = v.dot(w);
    const D = a * c - b * b;
    let sc, sN, sD = D;
    let tc, tN, tD = D;

    if (D < 1e-6) {
        sN = 0.0;
        sD = 1.0;
        tN = e;
        tD = c;
    } else {
        sN = (b * e - c * d);
        tN = (a * e - b * d);
        if (sN < 0.0) {
            sN = 0.0;
            tN = e;
            tD = c;
        } else if (sN > sD) {
            sN = sD;
            tN = e + b;
            tD = c;
        }
    }

    if (tN < 0.0) {
        tN = 0.0;
        if (-d < 0.0) sN = 0.0;
        else if (-d > a) sN = sD;
        else {
            sN = -d;
            sD = a;
        }
    } else if (tN > tD) {
        tN = tD;
        if ((-d + b) < 0.0) sN = 0;
        else if ((-d + b) > a) sN = sD;
        else {
            sN = (-d + b);
            sD = a;
        }
    }
    sc = (Math.abs(sN) < 1e-6 ? 0.0 : sN / sD);
    tc = (Math.abs(tN) < 1e-6 ? 0.0 : tN / tD);

    const dP = new Vector3().addVectors(w, u.multiplyScalar(sc)).sub(v.multiplyScalar(tc));
    return dP.length();
};

// Helper: Check Collision
const checkSelfCollision = (positions: Vector3[]) => {
    // Segments:
    // 0: Base -> J1 (Position 0)
    // 1: J1 -> J2 (Pos 0 -> 1)
    // 2: J2 -> J3 (Pos 1 -> 2)
    // 3: J3 -> J4 (Pos 2 -> 3)
    // 4: J4 -> J5 (Pos 3 -> 4)
    // 5: J5 -> J6 (Pos 4 -> 5)
    // 6: J6 -> J7 (Pos 5 -> 6)
    // 7: J7 -> Tip (Pos 6 -> 7)
    
    // Critical Checks: 
    // 1. Floor Check (Anything < 0)
    for (const p of positions) {
        if (p.y < FLOOR_LIMIT + 0.05) return true; // 0.05 buffer
    }

    // 2. Self Collision
    // We check non-adjacent links.
    // Links are defined by points [i] and [i+1].
    // Check Link I vs Link J where |i-j| > 1.
    
    // Simplify: Check "Tail" (Links 4,5,6,7) against "Body" (Links 1,2)
    // Link 1: J1-J2 (Pos 0 - Pos 1) -- Shoulder
    // Link 2: J2-J3 (Pos 1 - Pos 2) -- Upper Arm
    
    // Link 4: J4-J5 (Pos 3 - Pos 4)
    // Link 5: J5-J6 (Pos 4 - Pos 5)
    // Link 6: J6-J7 (Pos 5 - Pos 6)
    // Link 7: J7-Tip (Pos 6 - Pos 7) -- Gripper

    const segments = [];
    // Base is technically at (0,0,0) -> Pos 0
    segments.push({p1: new Vector3(0,0,0), p2: positions[0]}); 
    for(let i=0; i<positions.length-1; i++) {
        segments.push({ p1: positions[i], p2: positions[i+1] });
    }
    
    // Check loops
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 2; j < segments.length; j++) {
             const dist = distSegmentToSegment(
                 segments[i].p1, segments[i].p2,
                 segments[j].p1, segments[j].p2
             );
             
             // Threshold depends on link thickness. 
             // Approx link width is 0.25 -> radius 0.125.
             // Sum of radii = 0.25.
             if (dist < COLLISION_WARNING_THRESHOLD) {
                 return true;
             }
        }
    }
    
    return false;
};

// Helper: CCD IK Solver (Pure Function)
const solveIK = (targetPos: Vector3, currentAngles: number[], dims: RobotDimensions, configs: JointConfig[]) => {
    const newAngles = [...currentAngles];
    const boneOffsets = getBoneOffsets(dims);
    const threshold = 0.01;
    const maxIterations = 5; // Low iterations for realtime performance
    
    for (let iter = 0; iter < maxIterations; iter++) {
        const positions = computeFK(newAngles, dims);
        const endEffectorPos = positions[7]; 
        
        if (endEffectorPos.distanceTo(targetPos) < threshold) break;

        // Backward pass from J6 to J1 (J7 is roll, usually ignored for positional IK or handled separately)
        for (let i = 5; i >= 0; i--) {
            const jointPos = positions[i];
            const toEnd = new Vector3().subVectors(endEffectorPos, jointPos).normalize();
            const toTarget = new Vector3().subVectors(targetPos, jointPos).normalize();
            
            // Calculate rotation needed
            let angleDiff = toEnd.dot(toTarget);
            // Clamp to avoid numerical errors
            angleDiff = Math.max(-1, Math.min(1, angleDiff));
            
            if (Math.abs(1 - angleDiff) < 0.0001) continue;

            // Calculate Axis in World Space
            let tempMatrix = new Matrix4();
            tempMatrix.multiply(new Matrix4().makeTranslation(boneOffsets[0].x, boneOffsets[0].y, boneOffsets[0].z));
            for(let j=0; j<i; j++) {
                const rot = new Matrix4();
                if(JOINT_AXES[j].x) rot.makeRotationX(newAngles[j]);
                else if(JOINT_AXES[j].y) rot.makeRotationY(newAngles[j]);
                else rot.makeRotationZ(newAngles[j]);
                tempMatrix.multiply(rot);
                tempMatrix.multiply(new Matrix4().makeTranslation(boneOffsets[j+1].x, boneOffsets[j+1].y, boneOffsets[j+1].z));
            }

            const worldAxis = new Vector3().copy(JOINT_AXES[i]).transformDirection(tempMatrix).normalize();
            
            // Project vectors onto the plane perpendicular to the rotation axis
            const vE_proj = toEnd.clone().sub(worldAxis.clone().multiplyScalar(toEnd.dot(worldAxis))).normalize();
            const vT_proj = toTarget.clone().sub(worldAxis.clone().multiplyScalar(toTarget.dot(worldAxis))).normalize();
            
            let rotAngle = Math.acos(Math.max(-1, Math.min(1, vE_proj.dot(vT_proj))));
            
            // Determine direction
            const cross = new Vector3().crossVectors(vE_proj, vT_proj);
            if (cross.dot(worldAxis) < 0) rotAngle = -rotAngle;
            
            // Damping
            rotAngle *= 0.5; 
            
            newAngles[i] += rotAngle;
            
            // Apply Limits
            newAngles[i] = Math.max(configs[i].min, Math.min(configs[i].max, newAngles[i]));
            
            // Recalculate for next joint in chain
            const updatedPos = computeFK(newAngles, dims);
            endEffectorPos.copy(updatedPos[7]);
        }
    }
    return newAngles;
};

function App() {
  // UI State
  const [activeView, setActiveView] = useState<CameraView>('ORBIT');
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [fov, setFov] = useState(50);
  const [ikMode, setIkMode] = useState(false);
  const [isColliding, setIsColliding] = useState(false);
  const [cameraOffset, setCameraOffset] = useState({ pitch: 0, yaw: 0 });
  
  // Robot Config State - Initialize from LocalStorage if available
  const [dimensions, setDimensions] = useState<RobotDimensions>(() => {
    try {
        const saved = localStorage.getItem('robot_sim_dimensions');
        return saved ? JSON.parse(saved) : DEFAULT_DIMENSIONS;
    } catch (e) {
        console.warn('Failed to load dimensions from storage', e);
        return DEFAULT_DIMENSIONS;
    }
  });
  
  const [jointsConfig, setJointsConfig] = useState<JointConfig[]>(() => {
    try {
        const saved = localStorage.getItem('robot_sim_joints');
        return saved ? JSON.parse(saved) : DEFAULT_JOINTS;
    } catch (e) {
        console.warn('Failed to load joints from storage', e);
        return DEFAULT_JOINTS;
    }
  });
  
  // Workspace State
  const [workspacePoints, setWorkspacePoints] = useState<Float32Array>(new Float32Array(0));
  const [workspaceVersion, setWorkspaceVersion] = useState(0); // Used to force re-render of points
  const [workspaceDensity, setWorkspaceDensity] = useState(30000);

  // Refs for Loop Access (Prevents stale closures and loop duplication)
  const dimensionsRef = useRef(dimensions);
  const jointsConfigRef = useRef(jointsConfig);
  const jointValuesRef = useRef<number[]>(DEFAULT_JOINTS.map(j => j.defaultValue));
  const gripperValueRef = useRef(0);
  const controlModeRef = useRef(0);
  const ikModeRef = useRef(false);
  const ikTargetPosRef = useRef<Vector3>(new Vector3(0, 1.5, 1.5));
  const lastButtonStateRef = useRef<{ [key: number]: boolean }>({});
  const requestRef = useRef<number>(0);
  const workspaceDensityRef = useRef(workspaceDensity);

  // Sync Refs with State
  useEffect(() => { dimensionsRef.current = dimensions; }, [dimensions]);
  useEffect(() => { jointsConfigRef.current = jointsConfig; }, [jointsConfig]);
  useEffect(() => { workspaceDensityRef.current = workspaceDensity; }, [workspaceDensity]);

  // State for UI Rendering (decoupled from physics loop)
  const [uiJointValues, setUiJointValues] = useState<number[]>(DEFAULT_JOINTS.map(j => j.defaultValue));
  const [uiGripperValue, setUiGripperValue] = useState(0);
  const [controlMode, setControlMode] = useState(0);
  const [uiIkTarget, setUiIkTarget] = useState<[number, number, number]>([0, 2, 2]);

  // Configuration Handlers
  const handleSaveConfig = useCallback(() => {
      try {
        localStorage.setItem('robot_sim_dimensions', JSON.stringify(dimensions));
        localStorage.setItem('robot_sim_joints', JSON.stringify(jointsConfig));
        alert("配置已保存到浏览器缓存！");
      } catch (e) {
        alert("配置保存失败。");
        console.error(e);
      }
  }, [dimensions, jointsConfig]);

  const handleLoadConfig = useCallback(() => {
      try {
        const savedDims = localStorage.getItem('robot_sim_dimensions');
        const savedJoints = localStorage.getItem('robot_sim_joints');
        
        if (savedDims && savedJoints) {
            if (window.confirm("是否加载保存的配置？未保存的更改将会丢失。")) {
                setDimensions(JSON.parse(savedDims));
                setJointsConfig(JSON.parse(savedJoints));
            }
        } else {
            alert("未找到已保存的配置。");
        }
      } catch (e) {
        alert("加载配置出错。");
        console.error(e);
      }
  }, []);

  const handleResetConfig = useCallback(() => {
      if(window.confirm("确定要重置所有机械臂设置为出厂默认值吗？")) {
        setDimensions(DEFAULT_DIMENSIONS);
        setJointsConfig(DEFAULT_JOINTS);
        localStorage.removeItem('robot_sim_dimensions');
        localStorage.removeItem('robot_sim_joints');
      }
  }, []);

  // Handle Dragging of IK Target
  const handleTargetDrag = useCallback((newPos: Vector3) => {
      // If not in IK mode, auto-enable it to allow drag
      if (!ikModeRef.current) {
          setIkMode(true);
          ikModeRef.current = true;
      }
      
      // Update the ref immediately for the physics loop
      ikTargetPosRef.current.copy(newPos);
      // Update UI state for visual consistency
      setUiIkTarget([newPos.x, newPos.y, newPos.z]);
  }, []);

  // Workspace Generator
  const generateWorkspace = useCallback(() => {
      const points: number[] = [];
      const samples = workspaceDensityRef.current;
      const dims = dimensionsRef.current;
      const configs = jointsConfigRef.current;

      for(let i=0; i<samples; i++) {
          const randAngles = configs.map(j => j.min + Math.random() * (j.max - j.min));
          const positions = computeFK(randAngles, dims);
          // Check collision for sample points to only show valid space
          if (!checkSelfCollision(positions)) {
             const tip = positions[7];
             points.push(tip.x, tip.y, tip.z);
          }
      }
      
      setWorkspacePoints(new Float32Array(points));
      setWorkspaceVersion(v => v + 1); // Force visual update
  }, []);

  // Main Game Loop
  const updateLoop = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    const dims = dimensionsRef.current;
    const configs = jointsConfigRef.current;

    if (gp) {
      if (!gamepadConnected) setGamepadConnected(true);
      
      // Handle Buttons
      // Button 0 (A): Toggle IK
      if (gp.buttons[0].pressed && !lastButtonStateRef.current[0]) {
          const newMode = !ikModeRef.current;
          ikModeRef.current = newMode;
          setIkMode(newMode);
          if (newMode) {
              // Snap target to current tip position when enabling IK
              const positions = computeFK(jointValuesRef.current, dims);
              ikTargetPosRef.current.copy(positions[7]);
          }
      }
      
      // Mode switching (Manual only)
      if (!ikModeRef.current) {
        if (gp.buttons[4].pressed && !lastButtonStateRef.current[4]) {
            controlModeRef.current = (controlModeRef.current - 1 + 3) % 3;
            setControlMode(controlModeRef.current);
        }
        if (gp.buttons[5].pressed && !lastButtonStateRef.current[5]) {
            controlModeRef.current = (controlModeRef.current + 1) % 3;
            setControlMode(controlModeRef.current);
        }
      }

      // Update Button History
      lastButtonStateRef.current[0] = gp.buttons[0].pressed;
      lastButtonStateRef.current[4] = gp.buttons[4].pressed;
      lastButtonStateRef.current[5] = gp.buttons[5].pressed;

      // Analog Inputs
      const threshold = 0.1;
      const axis0 = Math.abs(gp.axes[0]) > threshold ? gp.axes[0] : 0; // LX
      const axis1 = Math.abs(gp.axes[1]) > threshold ? gp.axes[1] : 0; // LY
      const axis2 = Math.abs(gp.axes[2]) > threshold ? gp.axes[2] : 0; // RX
      const axis3 = Math.abs(gp.axes[3]) > threshold ? gp.axes[3] : 0; // RY

      // D-Pad States (used in both modes)
      const dUp = gp.buttons[12].pressed;
      const dDown = gp.buttons[13].pressed;
      const dLeft = gp.buttons[14].pressed;
      const dRight = gp.buttons[15].pressed;

      let proposedJoints = [...jointValuesRef.current];

      if (ikModeRef.current) {
          // IK Control
          const speed = 0.04;
          
          // Only update target from gamepad if axes are moving.
          // This prevents overwriting mouse drag with static gamepad values.
          if (Math.abs(axis0) > 0 || Math.abs(axis1) > 0 || Math.abs(axis3) > 0) {
             const proposedTarget = ikTargetPosRef.current.clone();
             proposedTarget.x -= axis0 * speed;
             proposedTarget.z -= axis1 * speed; // Forward/Back mapped to Z
             proposedTarget.y -= axis3 * speed; // R-Stick Y for Height
             proposedTarget.y = Math.max(0.05, proposedTarget.y); // Floor
             ikTargetPosRef.current.copy(proposedTarget);
          }
          
          // Manual Wrist adjustments don't move the target directly but affect joints
          // However, if we move wrist manually, FK end effector changes. 
          // The solver will then try to pull it back to Target.
          // So if we want "Manual Wrist Control" inside IK, we usually update Target to match new wrist position?
          // Or we treat Target as "Wrist Center" instead of "Tip".
          // Current solver targets Tip.
          // Let's leave logic simple: Gamepad moves target. D-Pad moves specific joints.
          
          // Solve IK for current target ref
          proposedJoints = solveIK(ikTargetPosRef.current, proposedJoints, dims, configs);

          // Manual Wrist adjustments (Post-IK Override)
          proposedJoints[6] -= axis2 * configs[6].speed; // Wrist Roll
          
          if (dUp) proposedJoints[5] += 0.02; // Up
          if (dDown) proposedJoints[5] -= 0.02; // Down
          if (dLeft) proposedJoints[4] -= 0.02; // Left
          if (dRight) proposedJoints[4] += 0.02; // Right
          
          // If we manually adjusted joints, we should update target ref to match new tip
          // so the arm doesn't snap back in next frame
          if (axis2 !== 0 || dUp || dDown || dLeft || dRight) {
              const newFk = computeFK(proposedJoints, dims);
              ikTargetPosRef.current.copy(newFk[7]);
          }

      } else {
          // Manual Control
          const mode = controlModeRef.current;
          if (mode === 0) {
             proposedJoints[0] -= axis0 * configs[0].speed;
             proposedJoints[1] -= axis1 * configs[1].speed;
             proposedJoints[2] -= axis2 * configs[2].speed;
          } else if (mode === 1) {
             proposedJoints[2] -= axis1 * configs[2].speed; // J3
             proposedJoints[3] -= axis3 * configs[3].speed; // J4
             proposedJoints[4] -= axis2 * configs[4].speed; // J5
          } else if (mode === 2) {
             proposedJoints[5] -= axis1 * configs[5].speed; // Pitch
             proposedJoints[6] -= axis2 * configs[6].speed; // Roll
             // D-Pad Extra Controls in Manual Mode
             if (dUp) proposedJoints[3] += 0.02; 
             if (dDown) proposedJoints[3] -= 0.02;
          }
      }
      
      // Gripper
      let gripperChange = 0;
      if (typeof gp.buttons[6] === 'object') gripperChange -= gp.buttons[6].value * 0.05;
      if (typeof gp.buttons[7] === 'object') gripperChange += gp.buttons[7].value * 0.05;
      let newGripper = gripperValueRef.current + gripperChange;
      newGripper = Math.max(0, Math.min(1, newGripper));
      gripperValueRef.current = newGripper;
      setUiGripperValue(newGripper);

      // Common Apply Logic
      proposedJoints.forEach((val, idx) => {
         proposedJoints[idx] = Math.max(configs[idx].min, Math.min(configs[idx].max, val));
      });

      const fkPositions = computeFK(proposedJoints, dims);
      const collisionDetected = checkSelfCollision(fkPositions);
      setIsColliding(collisionDetected);

      if (!collisionDetected) {
          jointValuesRef.current = proposedJoints;
      }

    } else {
      // NO GAMEPAD CONNECTED
      if (gamepadConnected) setGamepadConnected(false);
      
      // Even without gamepad, if IK Mode is active (e.g. via Mouse Drag auto-enable), we must solve
      if (ikModeRef.current) {
           let currentJoints = [...jointValuesRef.current];
           // Solve for current target ref (moved by mouse)
           currentJoints = solveIK(ikTargetPosRef.current, currentJoints, dims, configs);
           
           currentJoints.forEach((val, idx) => {
                currentJoints[idx] = Math.max(configs[idx].min, Math.min(configs[idx].max, val));
           });

           const fkPositions = computeFK(currentJoints, dims);
           const collisionDetected = checkSelfCollision(fkPositions);
           setIsColliding(collisionDetected);
           
           if (!collisionDetected) {
               jointValuesRef.current = currentJoints;
           }
      }
    }
    
    // Always update UI to reflect current physics state
    setUiJointValues(jointValuesRef.current);
    
    // Sync UI Target if moved by gamepad (if not moved by gamepad, this is redundant but harmless)
    // If moved by mouse, uiIkTarget is already set by handleTargetDrag, but this ensures consistency
    if (ikModeRef.current) {
         setUiIkTarget([ikTargetPosRef.current.x, ikTargetPosRef.current.y, ikTargetPosRef.current.z]);
    }
    
    requestRef.current = requestAnimationFrame(updateLoop);
  }, [gamepadConnected, generateWorkspace]);

  // Start/Stop Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateLoop);
    window.addEventListener("gamepadconnected", () => setGamepadConnected(true));
    window.addEventListener("gamepaddisconnected", () => setGamepadConnected(false));
    return () => {
        cancelAnimationFrame(requestRef.current);
        window.removeEventListener("gamepadconnected", () => setGamepadConnected(true));
        window.removeEventListener("gamepaddisconnected", () => setGamepadConnected(false));
    };
  }, [updateLoop]);

  return (
    <div className="w-screen h-screen bg-gray-900 text-white relative overflow-hidden font-sans selection:bg-blue-500/30">
      <Scene 
        jointValues={uiJointValues} 
        gripperValue={uiGripperValue}
        activeView={activeView}
        fov={fov}
        ikMode={ikMode}
        ikTarget={uiIkTarget}
        dimensions={dimensions}
        workspacePoints={workspacePoints}
        workspaceVersion={workspaceVersion}
        onTargetDrag={handleTargetDrag}
        jointsConfig={jointsConfig}
        isColliding={isColliding}
        cameraOffset={cameraOffset}
      />
      
      <Overlay 
        gamepadConnected={gamepadConnected}
        activeView={activeView}
        onViewChange={setActiveView}
        jointValues={uiJointValues}
        controlMode={controlMode}
        gripperValue={uiGripperValue}
        fov={fov}
        onFovChange={setFov}
        ikMode={ikMode}
        toggleIkMode={() => {
             const newMode = !ikMode;
             setIkMode(newMode);
             ikModeRef.current = newMode;
             if (newMode) {
                 const positions = computeFK(jointValuesRef.current, dimensionsRef.current);
                 ikTargetPosRef.current.copy(positions[7]);
             }
        }}
        dimensions={dimensions}
        onDimensionsChange={setDimensions}
        jointsConfig={jointsConfig}
        onJointsConfigChange={setJointsConfig}
        showWorkspace={workspacePoints.length > 0}
        onToggleWorkspace={generateWorkspace}
        workspaceDensity={workspaceDensity}
        onWorkspaceDensityChange={setWorkspaceDensity}
        isColliding={isColliding}
        cameraOffset={cameraOffset}
        onCameraOffsetChange={(axis, val) => setCameraOffset(prev => ({...prev, [axis]: val}))}
        onSaveConfig={handleSaveConfig}
        onLoadConfig={handleLoadConfig}
        onResetConfig={handleResetConfig}
      />
    </div>
  );
}

export default App;