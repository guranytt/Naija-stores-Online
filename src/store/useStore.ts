import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Vendor, Category, Order, CartItem, FlashDealProposal, Advertisement } from '../types';

export interface AppState {
  // UI State
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedVendorSlug: string | null;
  setSelectedVendorSlug: (slug: string | null) => void;
  initialCategory: string;
  setInitialCategory: (category: string) => void;
  searchFilter: string;
  setSearchFilter: (filter: string) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (isOpen: boolean) => void;
  settingsDrawerOpen: boolean;
  setSettingsDrawerOpen: (isOpen: boolean) => void;
  
  // Auth State
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  vendorAuthenticated: boolean;
  setVendorAuthenticated: (isAuthenticated: boolean) => void;
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;

  // Data State
  products: Product[];
  setProducts: (products: Product[] | ((prev: Product[]) => Product[])) => void;
  vendors: Vendor[];
  setVendors: (vendors: Vendor[] | ((prev: Vendor[]) => Vendor[])) => void;
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  orders: Order[];
  setOrders: (orders: Order[] | ((prev: Order[]) => Order[])) => void;
  ads: Advertisement[];
  setAds: (ads: Advertisement[]) => void;
  flashDeals: FlashDealProposal[];
  setFlashDeals: (deals: FlashDealProposal[]) => void;
  deliveryZones: any[];
  setDeliveryZones: (zones: any[]) => void;

  // Cart State & Actions
  cart: CartItem[];
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  addToCart: (product: Product, quantity: number, size?: string, color?: string) => void;
  updateCartQty: (productId: string, quantity: number, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  clearCart: () => void;
  checkoutAmount: number;
  setCheckoutAmount: (amount: number) => void;

  // Vendor Profile State
  userBankName: string;
  setUserBankName: (name: string) => void;
  userBankAccountNumber: string;
  setUserBankAccountNumber: (num: string) => void;
  userCacNumber: string;
  setUserCacNumber: (num: string) => void;
  userStoreName: string;
  setUserStoreName: (name: string) => void;
  userOwnerName: string;
  setUserOwnerName: (name: string) => void;
  userAvatar: string;
  setUserAvatar: (avatar: string) => void;
  userWhatsappNumber: string;
  setUserWhatsappNumber: (num: string) => void;
  userLocation: string;
  setUserLocation: (loc: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // UI State
      currentScreen: 'home',
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      selectedProductId: 'p1',
      setSelectedProductId: (id) => set({ selectedProductId: id }),
      selectedVendorSlug: 'eko-heritage-weavers',
      setSelectedVendorSlug: (slug) => set({ selectedVendorSlug: slug }),
      initialCategory: 'all',
      setInitialCategory: (category) => set({ initialCategory: category }),
      searchFilter: '',
      setSearchFilter: (filter) => set({ searchFilter: filter }),
      isCheckoutOpen: false,
      setIsCheckoutOpen: (isOpen) => set({ isCheckoutOpen: isOpen }),
      settingsDrawerOpen: false,
      setSettingsDrawerOpen: (isOpen) => set({ settingsDrawerOpen: isOpen }),

      // Auth State
      currentUserId: null,
      setCurrentUserId: (id) => set({ currentUserId: id }),
      userEmail: 'adminnaijastoresonline@gmail.com',
      setUserEmail: (email) => set({ userEmail: email }),
      vendorAuthenticated: false,
      setVendorAuthenticated: (isAuthenticated) => set({ vendorAuthenticated: isAuthenticated }),
      authReady: false,
      setAuthReady: (ready) => set({ authReady: ready }),

      // Data State
      products: [],
      setProducts: (productsOrUpdater) => {
        if (typeof productsOrUpdater === 'function') {
          set({ products: productsOrUpdater(get().products) });
        } else {
          set({ products: productsOrUpdater });
        }
      },
      vendors: [],
      setVendors: (vendorsOrUpdater) => {
        if (typeof vendorsOrUpdater === 'function') {
          set({ vendors: vendorsOrUpdater(get().vendors) });
        } else {
          set({ vendors: vendorsOrUpdater });
        }
      },
      categories: [],
      setCategories: (categories) => set({ categories }),
      orders: [],
      setOrders: (ordersOrUpdater) => {
        if (typeof ordersOrUpdater === 'function') {
          set({ orders: ordersOrUpdater(get().orders) });
        } else {
          set({ orders: ordersOrUpdater });
        }
      },
      ads: [],
      setAds: (ads) => set({ ads }),
      flashDeals: [],
      setFlashDeals: (deals) => set({ flashDeals: deals }),
      deliveryZones: [],
      setDeliveryZones: (zones) => set({ deliveryZones: zones }),

      // Cart State & Actions
      cart: [],
      setCart: (cartOrUpdater) => {
        if (typeof cartOrUpdater === 'function') {
          set({ cart: cartOrUpdater(get().cart) });
        } else {
          set({ cart: cartOrUpdater });
        }
      },
      addToCart: (product, quantity, size, color) => {
        const cart = get().cart;
        const existing = cart.find(
          (item) => item.product.id === product.id && item.selectedSize === size && item.selectedColor === color
        );
        if (existing) {
          set({
            cart: cart.map((item) =>
              item.product.id === product.id && item.selectedSize === size && item.selectedColor === color
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ cart: [...cart, { product, quantity, selectedSize: size, selectedColor: color }] });
        }
      },
      updateCartQty: (productId, quantity, size, color) => {
        set({
          cart: get().cart.map((item) =>
            item.product.id === productId && item.selectedSize === size && item.selectedColor === color
              ? { ...item, quantity }
              : item
          ),
        });
      },
      removeFromCart: (productId, size, color) => {
        set({
          cart: get().cart.filter(
            (item) => !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)
          ),
        });
      },
      clearCart: () => set({ cart: [] }),
      checkoutAmount: 0,
      setCheckoutAmount: (amount) => set({ checkoutAmount: amount }),

      // Vendor Profile State
      userBankName: '',
      setUserBankName: (name) => set({ userBankName: name }),
      userBankAccountNumber: '',
      setUserBankAccountNumber: (num) => set({ userBankAccountNumber: num }),
      userCacNumber: '',
      setUserCacNumber: (num) => set({ userCacNumber: num }),
      userStoreName: '',
      setUserStoreName: (name) => set({ userStoreName: name }),
      userOwnerName: '',
      setUserOwnerName: (name) => set({ userOwnerName: name }),
      userAvatar: '',
      setUserAvatar: (avatar) => set({ userAvatar: avatar }),
      userWhatsappNumber: '',
      setUserWhatsappNumber: (num) => set({ userWhatsappNumber: num }),
      userLocation: '',
      setUserLocation: (loc) => set({ userLocation: loc }),
    }),
    {
      name: 'naija-stores-storage',
      partialize: (state) => ({
        cart: state.cart,
        userEmail: state.userEmail,
        currentUserId: state.currentUserId,
        vendorAuthenticated: state.vendorAuthenticated,
        userBankName: state.userBankName,
        userBankAccountNumber: state.userBankAccountNumber,
        userCacNumber: state.userCacNumber,
        userStoreName: state.userStoreName,
        userOwnerName: state.userOwnerName,
        userAvatar: state.userAvatar,
        userWhatsappNumber: state.userWhatsappNumber,
        userLocation: state.userLocation,
        flashDeals: state.flashDeals
      }),
    }
  )
);
