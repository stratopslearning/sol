import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { redirect } from 'next/navigation';

async function getProductDetails() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/stripe/product`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch product details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching product details:', error);
    return null;
  }
}

export default async function PaymentPage() {
  const user = await getOrCreateUser();
  if (!user) redirect('/login');
  
  if (user.paid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030303]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Payment Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Thank you! Your payment has been received and you now have full access to all quizzes.</p>
            <Button asChild>
              <a href="/dashboard/student">Go to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const productData = await getProductDetails();
  const productName = productData?.product?.name || 'S-O-L Quiz Platform Access';
  const productDescription = productData?.product?.description || 'One-time payment for unlimited quiz access';
  const formattedPrice = productData?.price?.formatted_amount || '$9.99';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030303]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle>{productName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{productDescription}</p>
          <form
            action="/api/stripe/checkout"
            method="POST"
            className="flex flex-col items-center gap-4"
          >
            <Button type="submit" className="w-full">
              Pay {formattedPrice}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 