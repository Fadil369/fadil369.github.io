export interface CustomerAccountTokens {
  access_token: string;
  id_token: string;
  refresh_token: string;
  /** Epoch ms. */
  expires_at: number;
}

export interface CustomerAccountAddress {
  address1?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface CustomerAccountOrder {
  id: string;
  name: string;
  processedAt: string;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  totalPrice: { amount: string; currencyCode: string };
}

export interface CustomerAccountProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  defaultAddress?: CustomerAccountAddress | null;
  orders: CustomerAccountOrder[];
}
