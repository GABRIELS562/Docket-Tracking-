/**
 * ControlPanel Component Tests
 *
 * Tests for the main control panel that manages view modes,
 * panel toggles, and visualization settings.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ControlPanel from '../ControlPanel';
import { useStore } from '@/store/useStore';

// Mock the store
vi.mock('@/store/useStore');

describe('ControlPanel', () => {
  // Default mock store state
  const defaultMockState = {
    viewMode: '3d' as const,
    setViewMode: vi.fn(),
    isZonePanelOpen: false,
    isDocketPanelOpen: false,
    setZonePanelOpen: vi.fn(),
    setDocketPanelOpen: vi.fn(),
    heatMapEnabled: false,
    setHeatMapEnabled: vi.fn(),
    isPlaybackMode: false,
    setPlaybackMode: vi.fn(),
    floorPlanMode: '3d' as const,
    setFloorPlanMode: vi.fn(),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementation
    vi.mocked(useStore).mockReturnValue(defaultMockState);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders all control buttons', () => {
      render(<ControlPanel />);

      // Check for all button labels
      expect(screen.getByText('Zones')).toBeInTheDocument();
      expect(screen.getByText('3D View')).toBeInTheDocument();
      expect(screen.getByText('Top View')).toBeInTheDocument();
      expect(screen.getByText('Walk Mode')).toBeInTheDocument();
      expect(screen.getByText('Heat Map')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Dockets')).toBeInTheDocument();
    });

    it('renders floor plan mode buttons', () => {
      render(<ControlPanel />);

      // Floor plan buttons have labels: 3D, 2D, Split
      expect(screen.getByText('2D')).toBeInTheDocument();
      expect(screen.getByText('Split')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<ControlPanel />);

      // All buttons should have title attributes
      const zonesButton = screen.getByText('Zones').closest('button');
      expect(zonesButton).toHaveAttribute('title');
    });
  });

  describe('View Mode Controls', () => {
    it('shows 3D view as active when viewMode is 3d', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        viewMode: '3d',
      });

      render(<ControlPanel />);

      const button3D = screen.getByText('3D View').closest('button');
      expect(button3D).toHaveClass('bg-blue-500');
    });

    it('shows Top View as active when viewMode is top', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        viewMode: 'top',
      });

      render(<ControlPanel />);

      const topButton = screen.getByText('Top View').closest('button');
      expect(topButton).toHaveClass('bg-blue-500');
    });

    it('shows Walk Mode as active when viewMode is firstPerson', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        viewMode: 'firstPerson',
      });

      render(<ControlPanel />);

      const walkButton = screen.getByText('Walk Mode').closest('button');
      expect(walkButton).toHaveClass('bg-blue-500');
    });

    it('calls setViewMode with correct value when clicking 3D View', async () => {
      const setViewMode = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        viewMode: 'top',
        setViewMode,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('3D View'));

      expect(setViewMode).toHaveBeenCalledWith('3d');
      expect(setViewMode).toHaveBeenCalledTimes(1);
    });

    it('calls setViewMode with correct value when clicking Top View', async () => {
      const setViewMode = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        setViewMode,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Top View'));

      expect(setViewMode).toHaveBeenCalledWith('top');
    });

    it('calls setViewMode with correct value when clicking Walk Mode', async () => {
      const setViewMode = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        setViewMode,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Walk Mode'));

      expect(setViewMode).toHaveBeenCalledWith('firstPerson');
    });
  });

  describe('Panel Toggles', () => {
    it('shows Zones button as active when zone panel is open', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isZonePanelOpen: true,
      });

      render(<ControlPanel />);

      const zonesButton = screen.getByText('Zones').closest('button');
      expect(zonesButton).toHaveClass('bg-blue-500');
    });

    it('shows Dockets button as active when docket panel is open', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isDocketPanelOpen: true,
      });

      render(<ControlPanel />);

      const docketsButton = screen.getByText('Dockets').closest('button');
      expect(docketsButton).toHaveClass('bg-blue-500');
    });

    it('toggles zone panel when clicking Zones button', async () => {
      const setZonePanelOpen = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isZonePanelOpen: false,
        setZonePanelOpen,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Zones'));

      expect(setZonePanelOpen).toHaveBeenCalledWith(true);
    });

    it('closes zone panel when clicking Zones button while open', async () => {
      const setZonePanelOpen = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isZonePanelOpen: true,
        setZonePanelOpen,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Zones'));

      expect(setZonePanelOpen).toHaveBeenCalledWith(false);
    });

    it('toggles docket panel when clicking Dockets button', async () => {
      const setDocketPanelOpen = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isDocketPanelOpen: false,
        setDocketPanelOpen,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Dockets'));

      expect(setDocketPanelOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('Heat Map Toggle', () => {
    it('shows Heat Map button as inactive by default', () => {
      render(<ControlPanel />);

      const heatMapButton = screen.getByText('Heat Map').closest('button');
      expect(heatMapButton).not.toHaveClass('bg-blue-500');
      expect(heatMapButton).toHaveClass('text-gray-400');
    });

    it('shows Heat Map button as active when enabled', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        heatMapEnabled: true,
      });

      render(<ControlPanel />);

      const heatMapButton = screen.getByText('Heat Map').closest('button');
      expect(heatMapButton).toHaveClass('bg-blue-500');
    });

    it('toggles heat map when clicking Heat Map button', async () => {
      const setHeatMapEnabled = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        heatMapEnabled: false,
        setHeatMapEnabled,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Heat Map'));

      expect(setHeatMapEnabled).toHaveBeenCalledWith(true);
    });

    it('disables heat map when clicking while enabled', async () => {
      const setHeatMapEnabled = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        heatMapEnabled: true,
        setHeatMapEnabled,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Heat Map'));

      expect(setHeatMapEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe('Timeline Playback Toggle', () => {
    it('shows Timeline button as inactive by default', () => {
      render(<ControlPanel />);

      const timelineButton = screen.getByText('Timeline').closest('button');
      expect(timelineButton).not.toHaveClass('bg-blue-500');
    });

    it('shows Timeline button as active when playback mode is enabled', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isPlaybackMode: true,
      });

      render(<ControlPanel />);

      const timelineButton = screen.getByText('Timeline').closest('button');
      expect(timelineButton).toHaveClass('bg-blue-500');
    });

    it('toggles playback mode when clicking Timeline button', async () => {
      const setPlaybackMode = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isPlaybackMode: false,
        setPlaybackMode,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Timeline'));

      expect(setPlaybackMode).toHaveBeenCalledWith(true);
    });
  });

  describe('Floor Plan Mode Controls', () => {
    it('shows 3D floor plan mode as active by default', () => {
      render(<ControlPanel />);

      // Find the floor plan 3D button (distinct from view mode 3D View)
      const buttons = screen.getAllByRole('button');
      const floorPlan3D = buttons.find(
        (btn) => btn.textContent === '3D' && btn.getAttribute('title')?.includes('3D')
      );
      expect(floorPlan3D).toHaveClass('bg-blue-500');
    });

    it('shows 2D floor plan mode as active when selected', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        floorPlanMode: '2d',
      });

      render(<ControlPanel />);

      const button2D = screen.getByText('2D').closest('button');
      expect(button2D).toHaveClass('bg-blue-500');
    });

    it('shows Split floor plan mode as active when selected', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        floorPlanMode: 'split',
      });

      render(<ControlPanel />);

      const splitButton = screen.getByText('Split').closest('button');
      expect(splitButton).toHaveClass('bg-blue-500');
    });

    it('calls setFloorPlanMode with 2d when clicking 2D button', async () => {
      const setFloorPlanMode = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        setFloorPlanMode,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('2D'));

      expect(setFloorPlanMode).toHaveBeenCalledWith('2d');
    });

    it('calls setFloorPlanMode with split when clicking Split button', async () => {
      const setFloorPlanMode = vi.fn();
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        setFloorPlanMode,
      });

      const { user } = render(<ControlPanel />);

      await user.click(screen.getByText('Split'));

      expect(setFloorPlanMode).toHaveBeenCalledWith('split');
    });
  });

  describe('Button Active Indicators', () => {
    it('shows active indicator dot on active buttons', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isZonePanelOpen: true,
      });

      render(<ControlPanel />);

      const zonesButton = screen.getByText('Zones').closest('button');
      // Active buttons should have the pulsing indicator (subtle pulse animation)
      const indicator = zonesButton?.querySelector('.animate-pulse-subtle');
      expect(indicator).toBeInTheDocument();
    });

    it('does not show active indicator on inactive buttons', () => {
      render(<ControlPanel />);

      const zonesButton = screen.getByText('Zones').closest('button');
      const indicator = zonesButton?.querySelector('.animate-pulse-subtle');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('Button Title Attributes', () => {
    it('shows correct title for inactive button', () => {
      render(<ControlPanel />);

      const zonesButton = screen.getByText('Zones').closest('button');
      expect(zonesButton).toHaveAttribute('title', 'Zones');
    });

    it('shows correct title for active button indicating click to close', () => {
      vi.mocked(useStore).mockReturnValue({
        ...defaultMockState,
        isZonePanelOpen: true,
      });

      render(<ControlPanel />);

      const zonesButton = screen.getByText('Zones').closest('button');
      expect(zonesButton).toHaveAttribute('title', 'Zones (active - click to close)');
    });
  });
});
