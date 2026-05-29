import { useAppStore } from './AppStore';

describe('AppStore - Delivery', () => {
  beforeEach(() => {
    useAppStore.setState({
      systemOrders: [],
    });
  });

  it('initializes with default values', () => {
    const state = useAppStore.getState();
    expect(state.systemOrders).toEqual([]);
  });

  it('can update rider simulated position', () => {
    const { updateRiderSimulatedPosition } = useAppStore.getState();
    
    // Add a fake order to activeOrder
    useAppStore.setState({
      activeOrder: {
        id: 'order1',
        riderLat: 0,
        riderLng: 0,
      } as any
    });

    updateRiderSimulatedPosition('order1', 12.34, 56.78);
    const state = useAppStore.getState();
    expect(state.activeOrder?.riderLat).toBe(12.34);
    expect(state.activeOrder?.riderLng).toBe(56.78);
  });
});
