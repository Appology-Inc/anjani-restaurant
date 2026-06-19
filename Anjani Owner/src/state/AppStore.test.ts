import { useAppStore } from './AppStore';

describe('AppStore', () => {
  beforeEach(() => {
    // Reset state before each test
    useAppStore.setState({
      systemOrders: [],
      activeOrder: null,
      menuItems: [],
      isRestaurantOpen: true,
      restaurantCloseReason: null,
    });
  });

  it('initializes with default values', () => {
    const state = useAppStore.getState();
    expect(state.systemOrders).toEqual([]);
    expect(state.activeOrder).toBeNull();
    expect(state.menuItems).toEqual([]);
    expect(state.isRestaurantOpen).toBe(true);
  });

  it('can toggle restaurant status', async () => {
    // Mock the firebase call inside if needed, or simply test state if it doesn't fail
    const { toggleRestaurantStatus } = useAppStore.getState();
    
    // Toggle off
    await toggleRestaurantStatus(false, 'Too busy');
    let state = useAppStore.getState();
    expect(state.isRestaurantOpen).toBe(false);
    expect(state.restaurantCloseReason).toBe('Too busy');

    // Toggle on
    await toggleRestaurantStatus(true);
    state = useAppStore.getState();
    expect(state.isRestaurantOpen).toBe(true);
    expect(state.restaurantCloseReason).toBeNull();
  });
});
