import React, { useState, useEffect } from 'react';
import { Camera, Gamepad2, Move, Box, Sliders, Video, Eye, Crosshair, Activity, Settings, X, BarChart3, AlertTriangle, Save, RotateCcw, Download, HelpCircle, MousePointer2, Info, DownloadCloud } from 'lucide-react';
import { CameraView, RobotDimensions, JointConfig } from '../types';

interface OverlayProps {
    gamepadConnected: boolean;
    activeView: CameraView;
    onViewChange: (view: CameraView) => void;
    jointValues: number[];
    controlMode: number; 
    gripperValue: number;
    fov: number;
    onFovChange: (fov: number) => void;
    ikMode: boolean;
    toggleIkMode: () => void;
    dimensions: RobotDimensions;
    onDimensionsChange: (dims: RobotDimensions) => void;
    jointsConfig: JointConfig[];
    onJointsConfigChange: (cfg: JointConfig[]) => void;
    showWorkspace: boolean;
    onToggleWorkspace: () => void;
    workspaceDensity: number;
    onWorkspaceDensityChange: (val: number) => void;
    isColliding: boolean;
    cameraOffset: { pitch: number, yaw: number };
    onCameraOffsetChange: (axis: 'pitch'|'yaw', value: number) => void;
    onSaveConfig: () => void;
    onLoadConfig: () => void;
    onResetConfig: () => void;
    jointTorques?: number[];
}

const ViewButton = ({ 
    active, 
    label, 
    onClick, 
    icon: Icon 
}: { active: boolean; label: string; onClick: () => void; icon: any }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all text-[10px] font-medium w-16 border ${
            active 
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50' 
                : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:bg-gray-700'
        }`}
    >
        <Icon size={16} className="mb-1" />
        {label}
    </button>
);

const GuideModal = ({ onClose }: { onClose: () => void }) => (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in duration-300">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900/95 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Gamepad2 className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-none">操作指南</h2>
                        <p className="text-xs text-gray-400 mt-1">快速入门与功能介绍</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
                {/* Section 1: Control Modes */}
                <section>
                    <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16}/> 控制模式
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* IK Mode Card */}
                        <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700/50 hover:border-orange-500/50 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-white text-lg">🤖 IK 模式 (自动)</h4>
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/30">推荐</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-4">
                                移动“目标球”，机械臂将自动计算所有关节角度以到达目标位置。
                            </p>
                            <ul className="space-y-3 text-sm text-gray-300">
                                <li className="flex items-start gap-3">
                                    <span className="bg-orange-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[50px] text-center mt-0.5">左摇杆</span>
                                    <span>水平移动目标 (X / Z 轴)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-orange-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[50px] text-center mt-0.5">右摇杆</span>
                                    <span>调整高度 (Y 轴) & 手腕旋转</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-gray-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[50px] text-center mt-0.5">十字键</span>
                                    <span>微调手腕姿态 (俯仰/偏航)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[50px] text-center mt-0.5">鼠标</span>
                                    <span><MousePointer2 size={12} className="inline mr-1"/> 直接拖动场景中的哑铃目标！</span>
                                </li>
                            </ul>
                        </div>

                        {/* Manual Mode Card */}
                        <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-white text-lg">🕹️ 手动模式</h4>
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">高级</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-4">
                                直接控制各个关节角度。适用于复位姿态或需要精确控制每个电机时。
                            </p>
                            <ul className="space-y-3 text-sm text-gray-300">
                                <li className="flex items-start gap-3">
                                    <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[50px] text-center mt-0.5">双摇杆</span>
                                    <span>控制当前激活的关节对 (如 J1 & J2)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-gray-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[50px] text-center mt-0.5">LB / RB</span>
                                    <span>切换控制组 (底座 → 手臂 → 手腕)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[50px] text-center mt-0.5">A 键</span>
                                    <span>在 IK 和手动模式之间切换</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Section 2: Cameras */}
                    <section>
                        <h3 className="text-sm font-bold text-purple-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <Video size={16}/> 摄像系统
                        </h3>
                        <div className="bg-gray-800/30 p-4 rounded-xl space-y-3">
                            <div className="flex gap-3 items-start">
                                <Camera className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <h5 className="font-bold text-sm text-white">机载摄像头</h5>
                                    <p className="text-xs text-gray-400 mt-1">
                                        切换到 <span className="text-white font-bold">J2, J4, J6 或 手爪</span> 摄像头以获得第一人称视角。
                                        选中后可使用右侧滑条调整摄像头的平移与倾斜。
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <Move className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <h5 className="font-bold text-sm text-white">自由全景 (Orbit)</h5>
                                    <p className="text-xs text-gray-400 mt-1">
                                        使用鼠标左键旋转，右键平移，滚轮缩放。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Customization */}
                    <section>
                        <h3 className="text-sm font-bold text-green-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <Settings size={16}/> 参数配置
                        </h3>
                        <div className="bg-gray-800/30 p-4 rounded-xl space-y-3">
                            <p className="text-xs text-gray-300">
                                点击界面上方的 <Settings size={12} className="inline mx-1"/> 图标打开配置面板。
                            </p>
                            <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
                                <li><strong>尺寸设定:</strong> 实时修改每一段机械臂的长度。</li>
                                <li><strong>限位设定:</strong> 自定义每个关节的最小/最大角度限制。</li>
                                <li><strong>点云:</strong> 生成点云以可视化当前配置下的可达工作空间。</li>
                                <li><strong>保存/读取:</strong> 将您的自定义设计保存到浏览器缓存。</li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50 sticky bottom-0 flex justify-end">
                <button 
                    onClick={onClose} 
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/50 active:scale-95 flex items-center gap-2"
                >
                    开始使用 <Gamepad2 size={18}/>
                </button>
            </div>
        </div>
    </div>
);

export const Overlay: React.FC<OverlayProps> = ({ 
    gamepadConnected, 
    activeView, 
    onViewChange, 
    jointValues,
    controlMode,
    gripperValue,
    fov,
    onFovChange,
    ikMode,
    toggleIkMode,
    dimensions,
    onDimensionsChange,
    jointsConfig,
    onJointsConfigChange,
    showWorkspace,
    onToggleWorkspace,
    workspaceDensity,
    onWorkspaceDensityChange,
    isColliding,
    cameraOffset,
    onCameraOffsetChange,
    onSaveConfig,
    onLoadConfig,
    onResetConfig,
    jointTorques = []
}) => {
    const [showConfig, setShowConfig] = useState(false);
    const [configTab, setConfigTab] = useState<'DIMENSIONS' | 'LIMITS'>('DIMENSIONS');
    const [showGamepadHint, setShowGamepadHint] = useState(true);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    
    // Initialize guide state from localStorage
    const [showGuide, setShowGuide] = useState(() => {
        try {
            return !localStorage.getItem('has_seen_guide');
        } catch {
            return true;
        }
    });

    useEffect(() => {
        if (gamepadConnected) {
            setShowGamepadHint(false);
        }
    }, [gamepadConnected]);

    // PWA Install Prompt Listener
    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallApp = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                setInstallPrompt(null);
            });
        }
    };

    const handleCloseGuide = () => {
        setShowGuide(false);
        try {
            localStorage.setItem('has_seen_guide', 'true');
        } catch (e) {
            console.warn("Could not save guide preference", e);
        }
    };
    
    const getControlModeLabel = () => {
        if (ikMode) return "逆运动学 (自动)";
        switch(controlMode) {
            case 0: return "底座 & 肩部 (J1-J3)";
            case 1: return "中臂段 (J3-J5)";
            case 2: return "手腕 & 夹爪 (J5-J7)";
            default: return "底座";
        }
    };

    const handleDimensionChange = (key: keyof RobotDimensions, value: string) => {
        onDimensionsChange({
            ...dimensions,
            [key]: parseFloat(value)
        });
    };

    const handleLimitChange = (index: number, field: 'min' | 'max', value: string) => {
        const newConfig = [...jointsConfig];
        const rad = parseFloat(value) * (Math.PI / 180);
        newConfig[index] = { ...newConfig[index], [field]: rad };
        onJointsConfigChange(newConfig);
    };

    // Check if current view is a robot-mounted camera
    const isRobotCamera = ['SHOULDER', 'MID_ARM', 'WRIST', 'GRIPPER'].includes(activeView);

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">
            {/* Guide Modal */}
            {showGuide && <GuideModal onClose={handleCloseGuide} />}

            {/* Gamepad Recommendation Toast */}
            {showGamepadHint && !gamepadConnected && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-blue-900/80 border border-blue-500/50 text-blue-100 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md flex items-center gap-3 max-w-md">
                        <Gamepad2 className="text-blue-400 shrink-0" size={20} />
                        <div className="flex-1 text-xs">
                            <p className="font-bold">推荐连接手柄</p>
                            <p className="text-blue-200/70">为了获得最佳操控体验（特别是双摇杆控制），建议连接 Xbox 或 PS 手柄。</p>
                        </div>
                        <button onClick={() => setShowGamepadHint(false)} className="text-blue-300 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* COLLISION WARNING */}
            {isColliding && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                    <div className="bg-red-500/90 text-white px-8 py-4 rounded-2xl border-4 border-red-700 shadow-[0_0_50px_rgba(239,68,68,0.6)] flex flex-col items-center animate-pulse">
                        <AlertTriangle size={48} className="mb-2" />
                        <h1 className="text-4xl font-black uppercase tracking-widest">碰撞警告</h1>
                        <p className="font-mono text-sm mt-1">运动受阻 (MOVEMENT BLOCKED)</p>
                    </div>
                </div>
            )}

            {/* Header / Status */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-gray-900/90 border border-gray-700 p-4 rounded-xl backdrop-blur-sm shadow-2xl flex flex-col gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Box className="text-orange-500" />
                            七轴蛇形机械臂
                        </h1>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${gamepadConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className={gamepadConnected ? 'text-green-400' : 'text-red-400'}>
                                {gamepadConnected ? '手柄已连接' : '请连接手柄'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button 
                            onClick={toggleIkMode}
                            className={`flex-1 flex items-center justify-center py-1.5 px-3 rounded text-xs font-bold border transition-all ${
                                ikMode 
                                ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-900/40' 
                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {ikMode ? <Crosshair size={14} className="mr-2"/> : <Activity size={14} className="mr-2"/>}
                            {ikMode ? "IK 模式" : "手动模式"}
                        </button>

                        <button 
                            onClick={() => setShowConfig(!showConfig)}
                            className={`flex items-center justify-center py-1.5 px-3 rounded text-xs font-bold border transition-all ${
                                showConfig
                                ? 'bg-blue-600 border-blue-400 text-white' 
                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                            }`}
                            title="配置"
                        >
                            <Settings size={14} />
                        </button>

                        <button 
                            onClick={() => setShowGuide(true)}
                            className="flex items-center justify-center py-1.5 px-3 rounded text-xs font-bold border bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
                            title="帮助指南"
                        >
                            <HelpCircle size={14} />
                        </button>

                        {/* Install App Button */}
                        {installPrompt && (
                             <button 
                                onClick={handleInstallApp}
                                className="flex items-center justify-center py-1.5 px-3 rounded text-xs font-bold border bg-green-800/50 border-green-600 text-green-400 hover:bg-green-700 hover:text-white transition-all animate-pulse"
                                title="安装应用到本地 (支持离线)"
                            >
                                <DownloadCloud size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Config Panel */}
                {showConfig && (
                    <div className="absolute top-4 left-80 bg-gray-900/95 border border-gray-600 p-4 rounded-xl backdrop-blur-md shadow-2xl w-80 pointer-events-auto z-50 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                            <h2 className="text-sm font-bold text-white">机械臂配置</h2>
                            <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-white"><X size={16}/></button>
                        </div>
                        
                        <div className="flex mb-4 bg-gray-800 rounded p-1">
                            <button 
                                onClick={() => setConfigTab('DIMENSIONS')}
                                className={`flex-1 py-1 text-xs rounded ${configTab === 'DIMENSIONS' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                尺寸设定
                            </button>
                            <button 
                                onClick={() => setConfigTab('LIMITS')}
                                className={`flex-1 py-1 text-xs rounded ${configTab === 'LIMITS' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                限位设定
                            </button>
                        </div>

                        {configTab === 'DIMENSIONS' && (
                            <div className="space-y-3">
                                {Object.entries(dimensions).map(([key, val]) => (
                                    <div key={key} className="flex flex-col gap-1">
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span className="uppercase">{key}</span>
                                            <span>{(val as number).toFixed(2)}m</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.1" max="1.5" step="0.05"
                                            value={val as number}
                                            onChange={(e) => handleDimensionChange(key as keyof RobotDimensions, e.target.value)}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                ))}
                                
                                {/* Workspace Density Slider */}
                                <div className="pt-2 mt-2 border-t border-gray-700">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>点云密度</span>
                                        <span>{workspaceDensity.toLocaleString()} 点</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1000" max="2000000" step="1000"
                                        value={workspaceDensity}
                                        onChange={(e) => onWorkspaceDensityChange(parseInt(e.target.value))}
                                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button 
                                        onClick={onToggleWorkspace}
                                        className={`w-full flex items-center justify-center py-2 text-xs rounded border transition-all ${
                                            showWorkspace 
                                            ? 'bg-purple-600 border-purple-400 text-white hover:bg-purple-500' 
                                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                                        }`}
                                    >
                                        <BarChart3 size={14} className="mr-2" />
                                        {showWorkspace ? "更新点云" : "生成点云"}
                                    </button>
                                    <p className="text-[9px] text-gray-500 mt-1 text-center">计算当前配置下的可达工作空间。</p>
                                </div>
                            </div>
                        )}

                        {configTab === 'LIMITS' && (
                            <div className="space-y-4">
                                {jointsConfig.map((joint, idx) => {
                                    const minDeg = Math.round(joint.min * 180 / Math.PI);
                                    const maxDeg = Math.round(joint.max * 180 / Math.PI);
                                    return (
                                        <div key={joint.id} className="border-b border-gray-800 pb-3 last:border-0">
                                            <p className="text-xs font-bold text-blue-400 mb-2">{joint.name}</p>
                                            
                                            {/* Min Slider */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] w-6 text-gray-500">最小</span>
                                                <input 
                                                    type="range" 
                                                    min="-360" max="360" 
                                                    value={minDeg}
                                                    onChange={(e) => handleLimitChange(idx, 'min', e.target.value)}
                                                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                                                />
                                                <span className="text-[10px] w-8 text-right font-mono text-gray-300">{minDeg}°</span>
                                            </div>

                                            {/* Max Slider */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] w-6 text-gray-500">最大</span>
                                                <input 
                                                    type="range" 
                                                    min="-360" max="360" 
                                                    value={maxDeg}
                                                    onChange={(e) => handleLimitChange(idx, 'max', e.target.value)}
                                                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                                />
                                                <span className="text-[10px] w-8 text-right font-mono text-gray-300">{maxDeg}°</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Persistence Actions */}
                        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button 
                                    onClick={onSaveConfig}
                                    className="flex-1 flex items-center justify-center py-2 px-3 rounded text-[10px] font-bold border bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                    title="保存当前配置到浏览器"
                                >
                                    <Save size={12} className="mr-1.5"/>
                                    保存
                                </button>
                                <button 
                                    onClick={onLoadConfig}
                                    className="flex-1 flex items-center justify-center py-2 px-3 rounded text-[10px] font-bold border bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                    title="从浏览器加载配置"
                                >
                                    <Download size={12} className="mr-1.5"/>
                                    读取
                                </button>
                            </div>
                            <button 
                                onClick={onResetConfig}
                                className="w-full flex items-center justify-center py-2 px-3 rounded text-[10px] font-bold border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-900/40 transition-colors"
                                title="重置为默认设置"
                            >
                                <RotateCcw size={12} className="mr-1.5"/>
                                重置默认
                            </button>
                        </div>
                    </div>
                )}

                {/* Camera Controls */}
                <div className="flex flex-col gap-2 bg-gray-900/90 p-3 rounded-xl border border-gray-700 backdrop-blur-sm pointer-events-auto">
                    <div className="flex gap-2">
                        <ViewButton 
                            active={activeView === 'ORBIT'} 
                            label="全景" 
                            onClick={() => onViewChange('ORBIT')} 
                            icon={Move} 
                        />
                        <ViewButton 
                            active={activeView === 'TOP'} 
                            label="顶视" 
                            onClick={() => onViewChange('TOP')} 
                            icon={Video} 
                        />
                        <ViewButton 
                            active={activeView === 'SHOULDER'} 
                            label="J2视角" 
                            onClick={() => onViewChange('SHOULDER')} 
                            icon={Camera} 
                        />
                         <ViewButton 
                            active={activeView === 'MID_ARM'} 
                            label="J4视角" 
                            onClick={() => onViewChange('MID_ARM')} 
                            icon={Camera} 
                        />
                    </div>
                    <div className="flex gap-2">
                        <ViewButton 
                            active={activeView === 'WRIST'} 
                            label="J6视角" 
                            onClick={() => onViewChange('WRIST')} 
                            icon={Camera} 
                        />
                        <ViewButton 
                            active={activeView === 'GRIPPER'} 
                            label="手爪视角" 
                            onClick={() => onViewChange('GRIPPER')} 
                            icon={Camera} 
                        />
                        <div className="flex flex-col justify-center w-32 px-2">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span className="flex items-center gap-1"><Eye size={10}/> 视场角</span>
                                <span>{fov}°</span>
                            </div>
                            <input 
                                type="range" 
                                min="30" 
                                max="120" 
                                value={fov} 
                                onChange={(e) => onFovChange(parseInt(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    </div>

                    {/* Dynamic Camera Offset Controls (Only show for Robot Cameras) */}
                    {isRobotCamera && (
                        <div className="border-t border-gray-700 pt-2 mt-1">
                            <p className="text-[10px] text-gray-400 mb-2 font-bold uppercase">镜头调整 (平移/倾斜)</p>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                                        <span>俯仰</span>
                                        <span>{cameraOffset.pitch}°</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="-45" max="45" 
                                        value={cameraOffset.pitch}
                                        onChange={(e) => onCameraOffsetChange('pitch', parseInt(e.target.value))}
                                        className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-green-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                                        <span>偏航</span>
                                        <span>{cameraOffset.yaw}°</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="-45" max="45" 
                                        value={cameraOffset.yaw}
                                        onChange={(e) => onCameraOffsetChange('yaw', parseInt(e.target.value))}
                                        className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-green-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom HUD */}
            <div className="flex items-end justify-between pointer-events-auto">
                {/* Joint Readout */}
                <div className="bg-gray-900/90 border border-gray-700 p-4 rounded-xl backdrop-blur-sm shadow-2xl w-72">
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                        <Sliders size={14} /> {ikMode ? "自动解算状态 (IK)" : "关节数据 & 限位"}
                    </h3>
                    <div className="space-y-1">
                        {jointsConfig.map((joint, idx) => {
                            const isNearLimit = Math.abs(jointValues[idx] - joint.min) < 0.05 || Math.abs(jointValues[idx] - joint.max) < 0.05;
                            // Normalize torque for visualization (assuming max ~50 for demo)
                            const torque = jointTorques[idx] || 0;
                            const torquePercent = Math.min(100, Math.abs(torque) * 2);
                            const torqueColor = torquePercent > 80 ? 'bg-red-500' : torquePercent > 50 ? 'bg-yellow-500' : 'bg-green-500';

                            return (
                                <div key={joint.id} className="flex flex-col mb-1">
                                    <div className="flex justify-between text-xs font-mono items-center">
                                        <span className={
                                            !ikMode && (
                                                (controlMode === 0 && idx < 3) ||
                                                (controlMode === 1 && idx >= 2 && idx <= 4) ||
                                                (controlMode === 2 && idx >= 4) 
                                            )
                                            ? "text-blue-400 font-bold" 
                                            : "text-gray-500"
                                        }>
                                            {joint.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {isNearLimit && <span className="text-[9px] text-red-500 font-bold px-1 border border-red-900 rounded bg-red-900/20">极限</span>}
                                            <span className={isNearLimit ? "text-red-400" : "text-gray-300"}>
                                                {(jointValues[idx] * (180/Math.PI)).toFixed(1)}°
                                            </span>
                                        </div>
                                    </div>
                                    {/* Torque Bar */}
                                    <div className="w-full h-1 bg-gray-800 rounded overflow-hidden mt-0.5">
                                        <div 
                                            className={`h-full ${torqueColor} transition-all duration-100`} 
                                            style={{ width: `${torquePercent}%` }} 
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        <div className="flex justify-between text-xs font-mono border-t border-gray-700 mt-2 pt-2">
                            <span className="text-orange-400 font-bold">夹爪开合</span>
                            <span className="text-gray-300">{(gripperValue * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                {/* Controls Guide */}
                <div className="bg-gray-900/90 border border-gray-700 p-4 rounded-xl backdrop-blur-sm shadow-2xl text-right">
                    <div className="mb-2">
                        <span className="text-xs text-gray-400 uppercase block">当前模式</span>
                        <span className={`text-lg font-bold ${ikMode ? 'text-orange-400' : 'text-blue-400'}`}>
                            {getControlModeLabel()}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                        {ikMode ? (
                            <>
                                <div><span className="text-white bg-orange-600 px-1 rounded">左摇杆</span> 目标 前后左右移动</div>
                                <div><span className="text-white bg-orange-600 px-1 rounded">右摇杆</span> 高度升降 (Y) & 手腕旋转</div>
                                <div><span className="text-white bg-orange-600 px-1 rounded">十字键</span> 手腕 俯仰/偏航 微调</div>
                                <div><span className="text-white bg-gray-700 px-1 rounded">A 键</span> 切换手动模式</div>
                            </>
                        ) : (
                            <>
                                <div><span className="text-white bg-gray-700 px-1 rounded">左摇杆</span> 控制当前关节对</div>
                                <div><span className="text-white bg-gray-700 px-1 rounded">右摇杆</span> 控制次要关节对</div>
                                <div><span className="text-white bg-gray-700 px-1 rounded">LB/RB</span> 切换控制组</div>
                                <div><span className="text-white bg-gray-700 px-1 rounded">A 键</span> 切换 IK 模式</div>
                            </>
                        )}
                         <div><span className="text-white bg-gray-700 px-1 rounded">LT/RT</span> 夹爪开合</div>
                    </div>
                </div>
            </div>
        </div>
    );
};