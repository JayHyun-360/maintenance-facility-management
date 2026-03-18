"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface SpotlightTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TutorialStep[];
  onStepChange?: (stepIndex: number) => void;
}

export default function SpotlightTutorial({
  isOpen,
  onClose,
  steps,
  onStepChange,
}: SpotlightTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!isOpen || steps.length === 0) return;

    const step = steps[currentStep];
    const element = document.querySelector(step.targetSelector);

    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const newSpotlightStyle = {
        top: rect.top + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
        height: rect.height,
      };

      setSpotlightStyle(newSpotlightStyle);

      const cardWidth = 320;
      const cardHeight = 180;
      const gap = 16;
      const padding = 24;

      let cardTop = rect.top + scrollY + rect.height / 2 - cardHeight / 2;
      let cardLeft: number;

      const position = step.position || "right";

      switch (position) {
        case "left":
          cardLeft = rect.left + scrollX - cardWidth - gap;
          cardTop = rect.top + scrollY + rect.height / 2 - cardHeight / 2;
          break;
        case "top":
          cardLeft = rect.left + scrollX + rect.width / 2 - cardWidth / 2;
          cardTop = rect.top + scrollY - cardHeight - gap;
          break;
        case "bottom":
          cardLeft = rect.left + scrollX + rect.width / 2 - cardWidth / 2;
          cardTop = rect.top + scrollY + rect.height + gap;
          break;
        case "right":
        default:
          cardLeft = rect.left + scrollX + rect.width + gap;
          cardTop = rect.top + scrollY + rect.height / 2 - cardHeight / 2;
          break;
      }

      if (cardLeft < padding) {
        cardLeft = padding;
        if (position === "left") {
          cardLeft = rect.right + scrollX + gap;
        }
      }
      if (cardLeft + cardWidth > window.innerWidth - padding) {
        cardLeft = window.innerWidth - cardWidth - padding;
      }
      if (cardTop < padding) {
        cardTop = padding;
      }
      if (cardTop + cardHeight > window.innerHeight - padding) {
        cardTop = window.innerHeight - cardHeight - padding;
      }

      setCardPosition({ top: cardTop, left: cardLeft });
    }
  }, [isOpen, currentStep, steps]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      const handleResize = () => calculatePosition();
      window.addEventListener("resize", handleResize);
      const handleScroll = () => calculatePosition();
      window.addEventListener("scroll", handleScroll, true);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length && !isAnimating) {
      setIsAnimating(true);
      setCurrentStep(stepIndex);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
    setCurrentStep(0);
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100]"
      >
        <svg
          className="fixed inset-0 w-full h-full pointer-events-none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="white"
              />
              <motion.rect
                key={`spotlight-${currentStep}`}
                initial={{
                  x: spotlightStyle.left - 8,
                  y: spotlightStyle.top - 8,
                  width: spotlightStyle.width + 16,
                  height: spotlightStyle.height + 16,
                  rx: 12,
                }}
                animate={{
                  x: spotlightStyle.left - 8,
                  y: spotlightStyle.top - 8,
                  width: spotlightStyle.width + 16,
                  height: spotlightStyle.height + 16,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        <motion.div
          className="absolute rounded-xl border-2 border-green-400/50 shadow-[0_0_30px_rgba(74,222,128,0.3)] pointer-events-none"
          style={{
            position: "absolute",
            top: spotlightStyle.top - 8,
            left: spotlightStyle.left - 8,
            width: spotlightStyle.width + 16,
            height: spotlightStyle.height + 16,
          }}
          key={`spotlight-box-${currentStep}`}
          initial={{
            x: -8,
            y: -8,
            width: spotlightStyle.width + 16,
            height: spotlightStyle.height + 16,
          }}
          animate={{
            x: -8,
            y: -8,
            width: spotlightStyle.width + 16,
            height: spotlightStyle.height + 16,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          <div className="absolute inset-0 rounded-xl bg-green-400/10 animate-pulse" />
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`card-${currentStep}`}
          initial={{
            opacity: 0,
            scale: 0.9,
            x: cardPosition.left,
            y: cardPosition.top,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            x: cardPosition.left,
            y: cardPosition.top,
          }}
          exit={{
            opacity: 0,
            scale: 0.9,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="fixed z-[110] w-80"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
            <div className="h-1.5 bg-gray-200">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                initial={{ width: `${(currentStep / steps.length) * 100}%` }}
                animate={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">
                    {currentStepData.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {currentStepData.description}
              </p>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentStep === 0
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
                  >
                    {currentStep === steps.length - 1 ? "Finish" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[120]">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl px-4 py-2 rounded-full shadow-lg border border-white/50">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className={`relative transition-all duration-300 ${
                index === currentStep ? "w-6" : "w-2"
              }`}
            >
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                    : index < currentStep
                      ? "bg-green-300"
                      : "bg-gray-300"
                }`}
                style={{ width: index === currentStep ? "24px" : "8px" }}
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
