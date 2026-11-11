export const paymentLabels = {
  unspecified: "Nespecificat",
  cash: "Cash",
  card: "Card",
} as const;
export type PaymentMethod = keyof typeof paymentLabels;
