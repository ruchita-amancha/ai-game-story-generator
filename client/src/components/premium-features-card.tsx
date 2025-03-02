import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { FREE_TIER_LIMITS, PREMIUM_TIER_LIMITS } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const PREMIUM_PRICE = 1; // Monthly subscription price in INR

export default function PremiumFeaturesCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isPremium = user?.isPremium;
  const [paymentGateway, setPaymentGateway] = useState("stripe");
  const queryClient = useQueryClient();

const createCheckoutMutation = useMutation({
  mutationFn: async () => {
    const endpoint = paymentGateway === "stripe"
      ? "/api/create-checkout"
      : "/api/create-razorpay-order";
    const res = await apiRequest("POST", endpoint);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create payment session");
    }
    return res.json();
  },
  onSuccess: (data) => {
    if (paymentGateway === "stripe") {
      window.location.href = data.url;
    } else {
      // Wait for Razorpay SDK to load with timeout
      let attempts = 0;
      const maxAttempts = 10;

      const initRazorpay = () => {
        if (typeof window.Razorpay === "undefined") {
          if (attempts >= maxAttempts) {
            toast({
              title: "Payment initialization failed",
              description: "Failed to load payment gateway. Please try again later.",
              variant: "destructive",
            });
            return;
          }
          attempts++;
          console.log(`Waiting for Razorpay SDK to load... Attempt ${attempts}`);
          setTimeout(initRazorpay, 1000);
          return;
        }

        try {
          const options = {
            key: data.key_id,
            amount: data.amount,
            currency: "INR",
            name: "Game Story Generator",
            description: "Premium Subscription",
            order_id: data.id,
            handler: async function (response: any) {
              try {
                const verifyRes = await apiRequest("POST", "/api/verify-razorpay-payment", {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                });

                if (!verifyRes.ok) {
                  const error = await verifyRes.json();
                  throw new Error(error.error || "Payment verification failed");
                }

                toast({
                  title: "Payment successful",
                  description: "You now have access to premium features!",
                });

                queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              } catch (error: any) {
                console.error("Razorpay payment verification error:", error);
                toast({
                  title: "Payment verification failed",
                  description: error.message || "Payment verification failed",
                  variant: "destructive",
                });
              }
            },
            prefill: {
              name: user?.username,
            },
            theme: {
              color: "#0066FF",
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch (error: any) {
          console.error("Razorpay initialization error:", error);
          toast({
            title: "Payment initialization failed",
            description: error.message || "Unable to initialize payment gateway",
            variant: "destructive",
          });
        }
      };

      initRazorpay();
    }
  },
  onError: (error: Error) => {
    console.error("Payment session creation error:", error);
    toast({
      title: "Error creating payment session",
      description: error.message,
      variant: "destructive",
    });
  },
});

  const features = [
    {
      name: "Story Generations",
      free: `${FREE_TIER_LIMITS.GENERATIONS_PER_DAY} per day`,
      premium: `${PREMIUM_TIER_LIMITS.GENERATIONS_PER_DAY} per day`
    },
    {
      name: "Story Length",
      free: "Short and Medium",
      premium: "All lengths including Long stories"
    },
    {
      name: "Gameplay Details",
      free: "Basic mechanics",
      premium: "Detailed mechanics & systems"
    },
    {
      name: "World Building",
      free: "Basic world information",
      premium: "Advanced lore & world details"
    },
    {
      name: "Prompt Improvement",
      free: "Basic refinement",
      premium: "AI-powered refinement"
    }
  ];

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Premium Features
        </CardTitle>
        <CardDescription>
          {isPremium ? "You have access to all premium features" : "Upgrade to unlock premium features"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-medium">Feature</div>
            <div className="font-medium">Free Tier</div>
            <div className="font-medium text-primary">Premium Tier</div>
          </div>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 text-sm">
                <div>{feature.name}</div>
                <div className="text-muted-foreground">{feature.free}</div>
                <div className="flex items-center gap-2 text-primary">
                  {feature.premium}
                  {isPremium && <Check className="h-4 w-4" />}
                </div>
              </div>
            ))}
          </div>
          {!isPremium && (
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">₹{PREMIUM_PRICE}</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>

              <RadioGroup
                defaultValue="stripe"
                onValueChange={setPaymentGateway}
                className="grid grid-cols-2 gap-4 my-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stripe" id="stripe" />
                  <Label htmlFor="stripe">Stripe</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="razorpay" id="razorpay" />
                  <Label htmlFor="razorpay">Razorpay</Label>
                </div>
              </RadioGroup>

              <Button
                className="w-full"
                onClick={() => createCheckoutMutation.mutate()}
                disabled={createCheckoutMutation.isPending}
              >
                {createCheckoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}