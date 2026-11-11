import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Rocket, 
  Crosshair, 
  Zap, 
  Globe, 
  Trophy,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Welcome to ASTRA',
    icon: Rocket,
    content: [
      'You are an elite space pilot in the ASTRA combat arena.',
      'Master your ship, outmaneuver opponents, and claim victory!',
      'Let\'s go through the basics to get you combat-ready.'
    ],
    tips: ['Your profile tracks all stats and achievements']
  },
  {
    id: 'controls',
    title: 'Flight Controls',
    icon: Crosshair,
    content: [
      'WASD - Move your ship in any direction',
      'Mouse - Aim and look around',
      'Left Click - Fire primary weapons',
      'Shift - Boost for extra speed',
      'Q/E - Move up and down'
    ],
    tips: ['Practice in single player before going online']
  },
  {
    id: 'portals',
    title: 'Portal System',
    icon: Globe,
    content: [
      'Portals are your tactical advantage!',
      'Fly through any portal to instantly teleport',
      'Use them to escape danger or surprise enemies',
      'Each portal has an exit - learn the connections!'
    ],
    tips: ['Portal mastery separates rookies from aces']
  },
  {
    id: 'combat',
    title: 'Combat Basics',
    icon: Target,
    content: [
      'Your ship has shields and hull health',
      'Shields regenerate over time when not taking damage',
      'Weapons can overheat - fire in bursts!',
      'Boost energy is limited - use it wisely'
    ],
    tips: ['Keep moving to avoid enemy fire']
  },
  {
    id: 'objectives',
    title: 'Game Objectives',
    icon: Trophy,
    content: [
      'Eliminate enemy players to score points',
      'First to reach the score limit wins',
      'Use the environment to your advantage',
      'Stay within the combat zone boundaries'
    ],
    tips: ['Map knowledge is crucial for victory']
  },
  {
    id: 'ready',
    title: 'Ready for Combat!',
    icon: Shield,
    content: [
      'You\'re now ready to join the battle!',
      'Start with practice matches to hone your skills',
      'Check your stats and progress in your profile',
      'Good luck, pilot!'
    ],
    tips: ['May the best pilot win!']
  }
];

const GameTutorial = ({ isOpen, onComplete, isFirstTime = true, username = 'guest' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenAllSteps, setHasSeenAllSteps] = useState(false);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setHasSeenAllSteps(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {

    localStorage.setItem(`astra_tutorial_completed_${username}`, 'true');
    console.log(`Tutorial completed for user: ${username}`);
    onComplete();
  };

  const handleSkip = () => {
    if (!isFirstTime || window.confirm('Skip the tutorial? You can always view it later from the settings menu.')) {
      handleComplete();
    }
  };

  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-2xl mx-4"
          >
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-cyan-400 font-mono">
                  TUTORIAL PROGRESS
                </span>
                <span className="text-xs text-gray-400">
                  {currentStep + 1} / {tutorialSteps.length}
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="relative bg-slate-900/95 border border-cyan-500/30 rounded-lg p-8 shadow-2xl">

              {!isFirstTime && (
                <button
                  onClick={handleSkip}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  Skip Tutorial
                </button>
              )}

              <div className="flex justify-center gap-2 mb-6">
                {tutorialSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentStep 
                        ? 'w-8 bg-cyan-400' 
                        : index < currentStep
                        ? 'bg-cyan-600'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500/20 blur-xl" />
                      <Icon className="relative w-20 h-20 text-cyan-400" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-6">
                    {step.title}
                  </h3>

                  <div className="space-y-3 mb-8">
                    {step.content.map((line, index) => (
                      <p key={index} className="text-gray-300">
                        {line}
                      </p>
                    ))}
                  </div>

                  {step.tips.length > 0 && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-8">
                      <div className="flex items-center gap-2 text-cyan-400 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-bold">PRO TIP</span>
                      </div>
                      {step.tips.map((tip, index) => (
                        <p key={index} className="text-sm text-cyan-300">
                          {tip}
                        </p>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    currentStep === 0
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-white hover:bg-gray-800'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {currentStep === tutorialSteps.length - 1 ? (
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-cyan-700 transform hover:scale-105 transition-all"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Start Playing
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isFirstTime && currentStep === 0 && (
                <div className="mt-6 text-center">
                  <p className="text-xs text-orange-400">
                    ⚠️ This tutorial is mandatory for new pilots
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameTutorial;