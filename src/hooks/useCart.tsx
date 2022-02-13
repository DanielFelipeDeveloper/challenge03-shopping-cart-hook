import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get(`products/${productId}`);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const productInCart = cart.find(product => product.id === productId);
      const hasStock = productInCart ? stock.amount >= productInCart.amount + 1 : stock.amount >= 1;

      if (!Object.keys(product).length) throw Error;
      if (!hasStock) throw toast.error('Quantidade solicitada fora de estoque');

      let updatedCart;

      if (productInCart && hasStock) {
        updatedCart = [...cart.filter(product => product.id !== productId), {...product, amount: productInCart.amount + 1}];

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        updatedCart = [...cart, {...product, amount: 1}];

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if (!product) throw Error;

      const updatedCart = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };


  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      // const { data: product } = await api.get(`products/${productId}`);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      const hasStock = stock.amount >= amount;

      if (!hasStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      };

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          return {...product, amount};
        };

        return product;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
