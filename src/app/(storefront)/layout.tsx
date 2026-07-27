import { CartProvider } from "@/lib/cart-context";
import { CustomerAuthProvider } from "@/components/CustomerAuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerAuthProvider>
      <CartProvider>
        <Header />
        <main className="min-h-[70vh]">{children}</main>
        <Footer />
        <CartDrawer />
      </CartProvider>
    </CustomerAuthProvider>
  );
}
