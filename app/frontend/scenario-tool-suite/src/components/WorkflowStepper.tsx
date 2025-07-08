import React from 'react';
import { 
  Stepper, 
  StepperItem, 
  StepperIndicator, 
  StepperTrigger, 
  StepperSeparator,
  StepperTitle,
  StepperDescription 
} from '@/components/ui/stepper';
import { 
  Bot, 
  FileCheck, 
  Shield, 
  Eye,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface WorkflowStepperProps {
  currentStep: number;
  steps: WorkflowStep[];
  className?: string;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ 
  currentStep, 
  steps, 
  className 
}) => {
  const getStepIcon = (step: WorkflowStep, stepNumber: number) => {
    if (step.status === 'failed') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (step.status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (step.status === 'in_progress') {
      return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    }
    return step.icon;
  };

  return (
    <div className={cn("w-full", className)}>
      <Stepper value={currentStep} orientation="horizontal">
        {steps.map((step, index) => (
          <StepperItem
            key={step.id}
            step={step.id}
            completed={step.status === 'completed'}
            loading={step.status === 'in_progress'}
            className="flex-1"
          >
            <StepperTrigger asChild>
              <div className="flex flex-col items-center space-y-2 min-w-[120px]">
                <div className="relative">
                  <StepperIndicator 
                    className={cn(
                      "transition-all duration-300",
                      step.status === 'failed' && "bg-red-100 border-2 border-red-500",
                      step.status === 'in_progress' && "bg-blue-100 border-2 border-blue-500 animate-pulse",
                      step.status === 'completed' && "bg-green-100 border-2 border-green-500"
                    )}
                  />
                  {/* Status icon overlay */}
                  <div className="absolute -top-1 -right-1 z-10">
                    {step.status === 'completed' && (
                      <CheckCircle2 className="h-3 w-3 text-green-600 bg-white rounded-full" />
                    )}
                    {step.status === 'failed' && (
                      <AlertCircle className="h-3 w-3 text-red-600 bg-white rounded-full" />
                    )}
                    {step.status === 'in_progress' && (
                      <div className="h-3 w-3 bg-blue-500 rounded-full animate-ping" />
                    )}
                  </div>
                </div>
                
                <div className="text-center space-y-1">
                  <StepperTitle className={cn(
                    "text-xs font-medium transition-colors",
                    step.status === 'completed' && "text-green-700",
                    step.status === 'failed' && "text-red-700",
                    step.status === 'in_progress' && "text-blue-700",
                    step.status === 'pending' && "text-muted-foreground"
                  )}>
                    {step.title}
                  </StepperTitle>
                  <StepperDescription className="text-xs">
                    {step.description}
                  </StepperDescription>
                </div>
              </div>
            </StepperTrigger>
            {index < steps.length - 1 && (
              <StepperSeparator 
                className={cn(
                  "transition-colors duration-300",
                  step.status === 'completed' && "bg-green-500",
                  step.status === 'in_progress' && "bg-blue-300",
                  step.status === 'failed' && "bg-red-300"
                )}
              />
            )}
          </StepperItem>
        ))}
      </Stepper>
    </div>
  );
};

// Default workflow steps for ASAM scenario generation
export const defaultWorkflowSteps: WorkflowStep[] = [
  {
    id: 1,
    title: "AI Generation",
    description: "Creating scenario parameters",
    icon: <Bot className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 2,
    title: "File Generation", 
    description: "Building XOSC/XODR files",
    icon: <FileCheck className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 3,
    title: "Validation",
    description: "ASAM compliance check", 
    icon: <Shield className="h-4 w-4" />,
    status: 'pending'
  },
  {
    id: 4,
    title: "Visualization",
    description: "3D scene preparation",
    icon: <Eye className="h-4 w-4" />,
    status: 'pending'
  }
];

export default WorkflowStepper;