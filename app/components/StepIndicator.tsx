import { motion } from 'framer-motion';

interface StepIndicatorProps {
  steps: string[];
  currentStep: string;
}

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex justify-center"
    >
      <div className="inline-flex rounded-lg bg-white shadow-sm p-1">
        {steps.map((step) => (
          <motion.div
            key={step}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentStep === step
                ? 'bg-rose-500 text-white'
                : 'text-gray-500'
            }`}
            layout
          >
            {step.charAt(0).toUpperCase() + step.slice(1)}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}; 