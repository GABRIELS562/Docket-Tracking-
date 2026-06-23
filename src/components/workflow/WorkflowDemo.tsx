import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Wifi, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagBindingWizard } from './TagBindingWizard';
import { ProximityFind } from './ProximityFind';
import { JourneyTimeline } from './JourneyTimeline';

// ============================================================================
// Types
// ============================================================================

type WorkflowTab = 'binding' | 'proximity' | 'journey';

interface TabConfig {
  id: WorkflowTab;
  title: string;
  description: string;
  icon: typeof Tag;
}

const TABS: TabConfig[] = [
  {
    id: 'binding',
    title: 'Tag Binding',
    description: 'Bind RFID tags to dockets',
    icon: Tag,
  },
  {
    id: 'proximity',
    title: 'Proximity Find',
    description: 'Locate items by signal strength',
    icon: Wifi,
  },
  {
    id: 'journey',
    title: 'Journey Timeline',
    description: 'Track item movement history',
    icon: Clock,
  },
];

// ============================================================================
// Workflow Step Indicator
// ============================================================================

function WorkflowSteps() {
  return (
    <div className="flex items-center justify-center gap-2 mb-8 text-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full">
        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
          1
        </span>
        Intake
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600" />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full">
        <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">
          2
        </span>
        Track
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600" />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full">
        <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
          3
        </span>
        Find
      </div>
    </div>
  );
}

// ============================================================================
// Tab Navigation
// ============================================================================

interface TabNavigationProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg mb-6">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all',
              isActive
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{tab.title}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkflowDemo() {
  const [activeTab, setActiveTab] = useState<WorkflowTab>('binding');

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">RFID Docket Tracking Workflow</h1>
          <p className="text-gray-400">
            Complete end-to-end demonstration: intake a docket, track it, and find it
          </p>
        </div>

        {/* Workflow Steps Overview */}
        <WorkflowSteps />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'binding' && <TagBindingWizard />}
            {activeTab === 'proximity' && <ProximityFind />}
            {activeTab === 'journey' && <JourneyTimeline />}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This demo simulates the RFID-based evidence tracking workflow for SAPS forensic labs.
          </p>
          <p className="mt-1">
            In production, real RFID readers and barcode scanners would be used.
          </p>
        </div>
      </div>
    </div>
  );
}
