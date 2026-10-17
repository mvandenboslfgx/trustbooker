export const marketplace = {
  successFeeRate: 0.1,
  minimumBookingMinor: 500,
  currency: "EUR",
  buyerCoreAccessFree: true,
  providerSubscriptions: false,
  leadFees: false,
  paidRanking: false,
  paymentsEnabled: false,
  payoutsEnabled: false,
  disputesEnabled: false,
} as const;

export const serviceCategories = [
  { slug: "home", name: "Home & repairs", icon: "⌂", description: "Plumbing, electrical, painting and everyday repairs." },
  { slug: "cleaning", name: "Cleaning", icon: "✦", description: "Home, office, deep-clean and specialist services." },
  { slug: "garden", name: "Garden & outdoor", icon: "❋", description: "Landscaping, maintenance and outdoor projects." },
  { slug: "moving", name: "Moving & delivery", icon: "↗", description: "Local moving, transport and furniture delivery." },
  { slug: "beauty", name: "Beauty & wellness", icon: "◇", description: "Personal care, beauty, massage and wellness." },
  { slug: "lessons", name: "Lessons & coaching", icon: "◎", description: "Tutoring, coaching, languages and skills." },
  { slug: "events", name: "Events", icon: "✧", description: "Photography, catering, entertainment and planning." },
  { slug: "business", name: "Business services", icon: "□", description: "Design, IT, admin and professional support." },
] as const;
