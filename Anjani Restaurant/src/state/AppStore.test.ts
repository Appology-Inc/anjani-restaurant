import { useAppStore } from './AppStore';

describe('AppStore - Restaurant', () => {
  beforeEach(() => {
    useAppStore.setState({
      systemOrders: [],
      activeOrders: [],
      menuItems: [],
      cart: {},
    });
  });

  it('initializes with default values', () => {
    const state = useAppStore.getState();
    expect(state.systemOrders).toEqual([]);
    expect(state.activeOrders).toEqual([]);
    expect(state.cart).toEqual({});
  });

  it('can add items to cart', () => {
    const { addToCart } = useAppStore.getState();
    const testItem = {
      id: 'item1',
      name: 'Pizza',
      description: 'Cheese',
      price: 10,
      image: '',
      category: 'Pizza',
      isAvailable: true,
      isVeg: true,
      estimatedTime: '10 mins',
      rating: 4.5,
      calories: 300,
    };
    
    addToCart(testItem);
    addToCart(testItem);
    
    const state = useAppStore.getState();
    expect(Object.keys(state.cart).length).toBe(1);
    expect(state.cart['item1'].quantity).toBe(2);
    expect(state.cart['item1'].item.name).toBe('Pizza');
  });
});
