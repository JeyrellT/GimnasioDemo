export interface BrandingPricingTier {
  tier: string;
  price: string;
  clients: string;
  highlight: boolean;
}

export const BRANDING_PRICING_TIERS: BrandingPricingTier[] = [
  { tier: "Solo", price: "₡8,900", clients: "Hasta 5 clientes", highlight: false },
  { tier: "Pro", price: "₡22,900", clients: "Hasta 25 clientes", highlight: true },
  { tier: "Studio", price: "₡44,900", clients: "Hasta 60 clientes", highlight: false },
];
