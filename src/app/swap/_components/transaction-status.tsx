import React from 'react';
import { XCircleIcon, CheckCircleIcon, Clock } from 'lucide-react';

export enum TransactionStep {
  APPROVAL = 'approval',
  BRIDGE = 'bridge',
  SWAP = 'swap',
  RECEIVING = 'receiving',
  COMPLETE = 'complete',
}

export enum StepStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

interface Step {
  id: TransactionStep;
  title: string;
  description: string;
  status: StepStatus;
  txHash?: string;
  chainId?: number;
}

interface TransactionStatusProps {
  steps: Step[];
  currentStep: TransactionStep;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  steps,
  currentStep,
}) => {
  // Get explorer URL based on chain ID
  const getExplorerUrl = (chainId: number, txHash: string) => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
    };

    const baseUrl = explorers[chainId] || 'https://etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  // Render status icon based on step status
  const renderStatusIcon = (status: StepStatus) => {
    switch (status) {
      case StepStatus.COMPLETED:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case StepStatus.FAILED:
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case StepStatus.ACTIVE:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        );
      case StepStatus.PENDING:
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-xl border">
      <h3 className="font-medium mb-4">Transaction Status</h3>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-2.5 top-6 w-0.5 h-full -ml-px ${
                  step.status === StepStatus.COMPLETED
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            )}
            
            <div className="flex items-start">
              <div className="mt-1 mr-3">{renderStatusIcon(step.status)}</div>
              <div className="flex-grow">
                <div className="flex justify-between">
                  <h4 className="font-medium">{step.title}</h4>
                  {step.status === StepStatus.COMPLETED && (
                    <span className="text-xs text-green-500">Completed</span>
                  )}
                  {step.status === StepStatus.ACTIVE && (
                    <span className="text-xs text-blue-500">In Progress</span>
                  )}
                  {step.status === StepStatus.FAILED && (
                    <span className="text-xs text-red-500">Failed</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                
                {/* Transaction Hash Link */}
                {step.txHash && step.chainId && (
                  <a
                    href={getExplorerUrl(step.chainId, step.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 mt-1 inline-block hover:underline"
                  >
                    View Transaction
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionStatus;