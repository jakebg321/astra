import { loadFabric } from '../../utils/fabric.js';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    Save, 
    Download, 
    Palette, 
    Type, 
    Shapes, 
    Image as ImageIcon,
    Undo,
    Redo,
    Trash2,
    Crown,
    Shield,
    Swords,
    Star,
    Zap,
    Target,
    Flag,
    Award,
    Flame,
    Heart
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';


const PersonalBannerEditor = ({ onSave, onClose }) => {
    const { profile, updateProfile } = useUser();
    const canvasRef = useRef(null);
    const [canvas, setCanvas] = useState(null);
    const [activeTab, setActiveTab] = useState('shapes');
    const [selectedColor, setSelectedColor] = useState('#ff0000');
    const [fabricLoaded, setFabricLoaded] = useState(false);

    const shapes = [
        { icon: Shield, name: 'Shield', type: 'shield' },
        { icon: Crown, name: 'Crown', type: 'crown' },
        { icon: Swords, name: 'Crossed Swords', type: 'swords' },
        { icon: Star, name: 'Star', type: 'star' },
        { icon: Zap, name: 'Lightning', type: 'lightning' },
        { icon: Target, name: 'Target', type: 'target' },
        { icon: Flag, name: 'Flag', type: 'flag' },
        { icon: Award, name: 'Trophy', type: 'trophy' },
        { icon: Flame, name: 'Fire', type: 'fire' },
        { icon: Heart, name: 'Heart', type: 'heart' }
    ];

    const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
        '#FFD700', '#C0C0C0', '#8B4513', '#800080', '#FFA500', '#008000',
        '#000000', '#FFFFFF', '#808080', '#FF69B4', '#32CD32', '#1E90FF',
        '#FF4500', '#DC143C', '#9400D3', '#00CED1', '#FF1493', '#7FFF00'
    ];

    const gradients = [
        { name: 'Solar Flare', colors: ['#ff6b6b', '#feca57', '#ff9ff3'] },
        { name: 'Ocean Depths', colors: ['#74b9ff', '#0984e3', '#00b894'] },
        { name: 'Purple Haze', colors: ['#a29bfe', '#6c5ce7', '#fd79a8'] },
        { name: 'Sunset Blast', colors: ['#fd79a8', '#fdcb6e', '#e17055'] },
        { name: 'Emerald Dream', colors: ['#00b894', '#00cec9', '#55a3ff'] },
        { name: 'Royal Gold', colors: ['#6c5ce7', '#a29bfe', '#fdcb6e'] },
        { name: 'Cyber Neon', colors: ['#00ffff', '#ff00ff', '#ffff00'] },
        { name: 'Phoenix Fire', colors: ['#ff4757', '#ff6348', '#ffa502'] }
    ];

    useEffect(() => {
        let disposed = false;
        let fabricCanvas;
        const controller = new AbortController();
        setFabricLoaded(false);
        setCanvas(null);
        const initFabric = async () => {
            try {
                const fabric = await loadFabric();
                if (disposed || !canvasRef.current) return;
                fabricCanvas = new fabric.Canvas(canvasRef.current, {
                    width: 800,
                    height: 200,
                    backgroundColor: '#1a1a1a'
                });
                fabricCanvas.wrapperEl.style.maxWidth = '800px';
                fabricCanvas.setDimensions({ width: '100%', height: 'auto' }, { cssOnly: true });
                if (profile?.personal_banner) {
                    await fabricCanvas.loadFromJSON(profile?.personal_banner, undefined, { signal: controller.signal });
                }
                if (disposed) return;
                fabricCanvas.renderAll();
                setCanvas(fabricCanvas);
                setFabricLoaded(true);
            } catch (error) {
                if (!disposed) console.error('Failed to initialize banner editor:', error);
            }
        };
        void initFabric();
        return () => {
            disposed = true;
            controller.abort();
            if (fabricCanvas) void fabricCanvas.dispose();
        };
    }, [profile?.personal_banner]);

    const addShape = async (shapeType) => {
        if (!canvas || !fabricLoaded) return;

        const fabric = await loadFabric();
        let shape;

        switch (shapeType) {
            case 'shield':
                const shieldPath = 'M50,10 L90,25 L90,60 L80,80 L50,90 L20,80 L10,60 L10,25 Z';
                shape = new fabric.Path(shieldPath, {
                    fill: selectedColor,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    left: 200,
                    top: 50,
                    scaleX: 1.5,
                    scaleY: 1.5
                });
                break;
            case 'crown':
                shape = new fabric.Polygon([
                    {x: 0, y: 40}, {x: 20, y: 0}, {x: 40, y: 20}, {x: 60, y: 0}, 
                    {x: 80, y: 20}, {x: 100, y: 0}, {x: 120, y: 40}, {x: 120, y: 60}, 
                    {x: 0, y: 60}
                ], {
                    fill: selectedColor,
                    stroke: '#ffd700',
                    strokeWidth: 2,
                    left: 200,
                    top: 50
                });
                break;
            case 'star':
                shape = new fabric.Polygon([
                    {x: 50, y: 0}, {x: 61, y: 35}, {x: 98, y: 35}, {x: 68, y: 57},
                    {x: 79, y: 91}, {x: 50, y: 70}, {x: 21, y: 91}, {x: 32, y: 57},
                    {x: 2, y: 35}, {x: 39, y: 35}
                ], {
                    fill: selectedColor,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    left: 200,
                    top: 50
                });
                break;
            case 'heart':
                const heartPath = 'M50,90 C20,60 0,40 0,25 C0,10 10,0 25,0 C35,0 45,5 50,15 C55,5 65,0 75,0 C90,0 100,10 100,25 C100,40 80,60 50,90 Z';
                shape = new fabric.Path(heartPath, {
                    fill: selectedColor,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    left: 200,
                    top: 50,
                    scaleX: 1.2,
                    scaleY: 1.2
                });
                break;
            case 'fire':
                const firePath = 'M50,100 C30,90 20,70 25,50 C30,30 40,20 50,10 C60,20 70,30 75,50 C80,70 70,90 50,100 Z';
                shape = new fabric.Path(firePath, {
                    fill: selectedColor,
                    stroke: '#ff4500',
                    strokeWidth: 2,
                    left: 200,
                    top: 50,
                    scaleX: 1.3,
                    scaleY: 1.3
                });
                break;
            default:
                shape = new fabric.Rect({
                    width: 80,
                    height: 60,
                    fill: selectedColor,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    left: 200,
                    top: 50
                });
        }

        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
    };

    const addText = async () => {
        if (!canvas || !fabricLoaded) return;

        const fabric = await loadFabric();
        const text = new fabric.FabricText(profile?.username || 'PLAYER', {
            left: 100,
            top: 80,
            fill: selectedColor,
            fontSize: 40,
            fontWeight: 'bold',
            fontFamily: 'Arial Black'
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
    };

    const addGradientBackground = async (gradientColors) => {
        if (!canvas || !fabricLoaded) return;

        const fabric = await loadFabric();
        const gradient = new fabric.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: 800, y2: 200 },
            colorStops: gradientColors.map((color, index) => ({
                offset: index / (gradientColors.length - 1),
                color: color
            }))
        });

        const rect = new fabric.Rect({
            width: 800,
            height: 200,
            fill: gradient,
            selectable: false,
            evented: false
        });

        canvas.add(rect);
        canvas.sendObjectToBack(rect);
        canvas.renderAll();
    };

    const deleteSelected = () => {
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.remove(activeObject);
            canvas.renderAll();
        }
    };

    const saveBanner = async () => {
        if (!canvas) return;
        
        try {
            const bannerData = JSON.stringify(canvas.toJSON());
            await updateProfile({ personal_banner: bannerData });
            
            if (onSave) {
                onSave(bannerData);
            }
            
            alert('Personal banner saved successfully!');
        } catch (error) {
            console.error('Error saving banner:', error);
            alert('Failed to save banner');
        }
    };

    const downloadBanner = () => {
        if (!canvas) return;
        
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2
        });
        
        const link = document.createElement('a');
        link.download = `${profile?.username || 'player'}-banner.png`;
        link.href = dataURL;
        link.click();
    };

    const clearCanvas = () => {
        if (!canvas) return;
        canvas.clear();
        canvas.backgroundColor = '#1a1a1a';
        canvas.requestRenderAll();
    };

    return (
        <div className="personal-banner-editor bg-gray-900 rounded-lg p-6">
            {!fabricLoaded && <p role="status" className="text-gray-400">Loading banner editor...</p>}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Flag className="text-purple-400" />
                    Personal Banner Editor
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={saveBanner}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                        <Save size={16} />
                        Save Banner
                    </button>
                    <button
                        onClick={downloadBanner}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        Download
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <div className="bg-black/50 p-4 rounded-lg">
                        <canvas
                            ref={canvasRef}
                            className="border border-gray-600 rounded max-w-full"
                        />
                        
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={deleteSelected}
                                className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                            <button
                                onClick={clearCanvas}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-wrap gap-1">
                        {[
                            { id: 'shapes', icon: Shapes, label: 'Shapes' },
                            { id: 'text', icon: Type, label: 'Text' },
                            { id: 'colors', icon: Palette, label: 'Colors' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {activeTab === 'shapes' && (
                            <div>
                                <h3 className="text-lg font-bold text-white mb-3">Shapes & Symbols</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {shapes.map(shape => (
                                        <button
                                            key={shape.type}
                                            onClick={() => addShape(shape.type)}
                                            className="flex flex-col items-center gap-2 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                        >
                                            <shape.icon className="text-purple-400" size={24} />
                                            <span className="text-xs text-gray-300">{shape.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'text' && (
                            <div>
                                <h3 className="text-lg font-bold text-white mb-3">Text</h3>
                                <button
                                    onClick={addText}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                >
                                    <Type size={20} />
                                    Add Your Name
                                </button>
                            </div>
                        )}

                        {activeTab === 'colors' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-3">Colors</h3>
                                    <div className="grid grid-cols-6 gap-2">
                                        {colors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-8 h-8 rounded border-2 transition-all ${
                                                    selectedColor === color
                                                        ? 'border-white scale-110'
                                                        : 'border-gray-600 hover:border-gray-400'
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-md font-bold text-white mb-3">Gradient Backgrounds</h4>
                                    <div className="space-y-2">
                                        {gradients.map(gradient => (
                                            <button
                                                key={gradient.name}
                                                onClick={() => addGradientBackground(gradient.colors)}
                                                className="w-full p-2 rounded-lg text-white text-sm transition-colors hover:scale-105"
                                                style={{
                                                    background: `linear-gradient(45deg, ${gradient.colors.join(', ')})`
                                                }}
                                            >
                                                {gradient.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalBannerEditor;