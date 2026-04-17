import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  DollarSign,
  Calculator,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { useAIAnalyticsStore } from '../../stores/aiAnalyticsStore';
import { useSceneStore } from '../../stores/sceneStore';

/**
 * ROI Calculator
 *
 * Real-time savings calculator that shows the business value of RFID tracking.
 * Displays impressive numbers that investors love to see.
 */

// Industry-specific metrics
const INDUSTRY_METRICS = {
  'saps-forensics': {
    searchTimeWithout: 45, // minutes without RFID
    searchTimeWith: 3.2, // minutes with RFID
    searchesPerDay: 85,
    hourlyRate: 350, // ZAR per hour
    lostItemCost: 15000, // ZAR per lost evidence
    lostItemsWithout: 2.5, // per month
    lostItemsWith: 0.1,
    currency: 'R',
    compliancePenalty: 250000, // Monthly compliance risk
    complianceReduction: 0.95,
  },
  'meditrack': {
    searchTimeWithout: 25,
    searchTimeWith: 2.5,
    searchesPerDay: 120,
    hourlyRate: 450,
    lostItemCost: 75000,
    lostItemsWithout: 1.5,
    lostItemsWith: 0.05,
    currency: 'R',
    compliancePenalty: 500000,
    complianceReduction: 0.98,
  },
  'minesecure': {
    searchTimeWithout: 35,
    searchTimeWith: 4,
    searchesPerDay: 60,
    hourlyRate: 280,
    lostItemCost: 45000,
    lostItemsWithout: 3,
    lostItemsWith: 0.15,
    currency: 'R',
    compliancePenalty: 350000,
    complianceReduction: 0.92,
  },
  'retailguard': {
    searchTimeWithout: 15,
    searchTimeWith: 1.5,
    searchesPerDay: 200,
    hourlyRate: 180,
    lostItemCost: 2500,
    lostItemsWithout: 25,
    lostItemsWith: 2,
    currency: 'R',
    compliancePenalty: 100000,
    complianceReduction: 0.85,
  },
};

const ROICalculator = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [animatedSavings, setAnimatedSavings] = useState(0);
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);
  const tenantConfig = useAIAnalyticsStore((s) => s.tenantConfig);
  const visibleItemCount = useSceneStore((s) => s.visibleItemCount);

  const metrics = useMemo(() => {
    const tenantId = currentTenant || 'saps-forensics';
    return INDUSTRY_METRICS[tenantId as keyof typeof INDUSTRY_METRICS] || INDUSTRY_METRICS['saps-forensics'];
  }, [currentTenant]);

  // Calculate ROI metrics
  const roi = useMemo(() => {
    const timeSavedPerSearch = metrics.searchTimeWithout - metrics.searchTimeWith;
    const dailyTimeSaved = (timeSavedPerSearch * metrics.searchesPerDay) / 60; // hours
    const dailyLaborSavings = dailyTimeSaved * metrics.hourlyRate;
    const monthlyLaborSavings = dailyLaborSavings * 22; // work days

    const monthlyLostItemSavings =
      (metrics.lostItemsWithout - metrics.lostItemsWith) * metrics.lostItemCost;

    const monthlyComplianceSavings =
      metrics.compliancePenalty * metrics.complianceReduction;

    const totalMonthlySavings =
      monthlyLaborSavings + monthlyLostItemSavings + monthlyComplianceSavings;

    const annualSavings = totalMonthlySavings * 12;

    // Efficiency improvement percentage
    const efficiencyGain = Math.round(
      ((metrics.searchTimeWithout - metrics.searchTimeWith) / metrics.searchTimeWithout) * 100
    );

    return {
      timeSavedPerSearch,
      dailyTimeSaved,
      dailyLaborSavings,
      monthlyLaborSavings,
      monthlyLostItemSavings,
      monthlyComplianceSavings,
      totalMonthlySavings,
      annualSavings,
      efficiencyGain,
    };
  }, [metrics]);

  // Animated counter for total savings
  useEffect(() => {
    const target = roi.totalMonthlySavings;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedSavings(target);
        clearInterval(timer);
      } else {
        setAnimatedSavings(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [roi.totalMonthlySavings]);

  const formatCurrency = (value: number) => {
    return `${metrics.currency}${Math.round(value).toLocaleString()}`;
  };

  return (
    <div className="absolute top-24 left-4 z-30 w-80">
      {/* Header */}
      <div
        className={`bg-gradient-to-r from-emerald-900/95 to-green-900/95 backdrop-blur-xl border border-emerald-500/30 cursor-pointer transition-all ${
          isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">ROI Calculator</h3>
              <p className="text-emerald-400/70 text-xs">Live Savings</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-emerald-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-emerald-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-b-2xl border border-t-0 border-emerald-500/20 p-4 space-y-4">
          {/* Hero Stat - Monthly Savings */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-xl p-4 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Monthly Savings</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(animatedSavings)}
            </div>
            <div className="text-emerald-400/70 text-xs mt-1">
              {formatCurrency(roi.annualSavings)} annually
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            {/* Time Savings */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-white text-sm font-medium">Search Time</div>
                  <div className="text-gray-500 text-xs">
                    {metrics.searchTimeWithout} min → {metrics.searchTimeWith} min
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">
                  {roi.efficiencyGain}%
                </div>
                <div className="text-gray-500 text-xs">faster</div>
              </div>
            </div>

            {/* Daily Hours Saved */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-white text-sm font-medium">Daily Time Saved</div>
                  <div className="text-gray-500 text-xs">
                    {metrics.searchesPerDay} searches/day
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-amber-400 font-bold">
                  {roi.dailyTimeSaved.toFixed(1)}h
                </div>
                <div className="text-gray-500 text-xs">per day</div>
              </div>
            </div>

            {/* Labor Cost Savings */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-white text-sm font-medium">Labor Savings</div>
                  <div className="text-gray-500 text-xs">
                    @ {formatCurrency(metrics.hourlyRate)}/hour
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold">
                  {formatCurrency(roi.monthlyLaborSavings)}
                </div>
                <div className="text-gray-500 text-xs">per month</div>
              </div>
            </div>

            {/* Lost Item Prevention */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-red-400" />
                <div>
                  <div className="text-white text-sm font-medium">Loss Prevention</div>
                  <div className="text-gray-500 text-xs">
                    {metrics.lostItemsWithout} → {metrics.lostItemsWith} lost/mo
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-red-400 font-bold">
                  {formatCurrency(roi.monthlyLostItemSavings)}
                </div>
                <div className="text-gray-500 text-xs">saved</div>
              </div>
            </div>
          </div>

          {/* Items Tracked */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-300 text-sm">Items Tracked</span>
            </div>
            <span className="text-cyan-400 font-bold">{visibleItemCount || 250}+</span>
          </div>

          {/* Industry Label */}
          <div className="text-center text-xs text-gray-600 pt-2 border-t border-white/5">
            Calculated for {tenantConfig?.name || 'SAPS Forensics'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ROICalculator;
