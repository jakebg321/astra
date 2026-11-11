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
    Flag
} from 'lucide-react';


const ClanBannerEditor = ({ initialBannerData, onSave, onClose }) => {
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
        { icon: Flag, name: 'Flag', type: 'flag' }
    ];

    const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
        '#FFD700', '#C0C0C0', '#8B4513', '#800080', '#FFA500', '#008000',
        '#000000', '#FFFFFF', '#808080', '#FF69B4', '#32CD32', '#1E90FF'
    ];

    const gradients = [
        { name: 'Fire', colors: ['#ff6b6b', '#feca57'] },
        { name: 'Ocean', colors: ['#74b9ff', '#0984e3'] },
        { name: 'Purple', colors: ['#a29bfe', '#6c5ce7'] },
        { name: 'Sunset', colors: ['#fd79a8', '#fdcb6e'] },
        { name: 'Forest', colors: ['#00b894', '#00cec9'] },
        { name: 'Royal', colors: ['#6c5ce7', '#a29bfe'] }
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
                    width: 512,
                    height: 256,
                    backgroundColor: '#1a1a1a'
                });
                fabricCanvas.wrapperEl.style.maxWidth = '512px';
                fabricCanvas.setDimensions({ width: '100%', height: 'auto' }, { cssOnly: true });
                if (initialBannerData) {
                    await fabricCanvas.loadFromJSON(initialBannerData, undefined, { signal: controller.signal });
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
    }, [initialBannerData]);

    const addShape = async (shapeType) => {
        if (!canvas || !fabricLoaded) return;

        const fabric = await loadFabric();
        let shape;

        switch (shapeType) {
            case 'shield':

                const shieldPath = 'M256,50 L450,120 L450,300 L380,400 L256,450 L132,400 L62,300 L62,120 Z';
                shape = new fabric.Path(shieldPath, {
                    fill: selectedColor,
                    stroke: '#ffffff',
                    strokeWidth: 3,
                    scaleX: 0.3,
                    scaleY: 0.3,
                    left: 200,
                    top: 100
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
                    top: 100
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
                    top: 100
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
                    top: 100
                });
        }

        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
    };

    const addText = async () => {
        if (!canvas || !fabricLoaded) return;

        const fabric = await loadFabric();
        const text = new fabric.FabricText('CLAN TAG', {
            left: 150,
            top: 120,
            fill: selectedColor,
            fontSize: 32,
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
            coords: { x1: 0, y1: 0, x2: 512, y2: 256 },
            colorStops: [
                { offset: 0, color: gradientColors[0] },
                { offset: 1, color: gradientColors[1] }
            ]
        });

        const rect = new fabric.Rect({
            width: 512,
            height: 256,
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

    const saveBanner = () => {
        if (!canvas) return;
        
        const bannerData = JSON.stringify(canvas.toJSON());
        if (onSave) {
            onSave(bannerData);
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
        link.download = 'clan-banner.png';
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
        <div className="clan-banner-editor bg-gray-900 rounded-lg p-6">
            {!fabricLoaded && <p role="status" className="text-gray-400">Loading banner editor...</p>}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Flag className="text-purple-400" />
                    Clan Banner Editor
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={saveBanner}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                        <Save size={16} />
                        Save
                    </button>
                    <button
                        onClick={downloadBanner}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        Download
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
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
                                    Add Text
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
                                                    background: `linear-gradient(45deg, ${gradient.colors[0]}, ${gradient.colors[1]})`
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

export default ClanBannerEditor;