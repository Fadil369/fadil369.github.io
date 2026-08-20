import { getValidAccessToken } from './customerAccountAuth';
import { getCustomerApiEndpoint } from './customerAccountDiscovery';
import type { CustomerAccountOrder, CustomerAccountProfile } from './customerAccountTypes';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in to Shopify customer account');
    this.name = 'NotSignedInError';
  }
}

const CUSTOMER_PROFILE_QUERY = /* GraphQL */ `
  query CustomerProfile {
    customer {
      id
      firstName
      lastName
      emailAddress { emailAddress }
      defaultAddress { address1 city province zip country }
      orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            name
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice { amount currencyCode }
          }
        }
      }
    }
  }
`;

interface CustomerProfileQueryResult {
  data?: {
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      emailAddress: { emailAddress: string } | null;
      defaultAddress: {
        address1: string | null;
        city: string | null;
        province: string | null;
        zip: string | null;
        country: string | null;
      } | null;
      orders: { edges: { node: CustomerAccountOrder }[] };
    };
  };
  errors?: { message: string }[];
}

export async function customerAccountFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new NotSignedInError();

  const endpoint = await getCustomerApiEndpoint();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Shopify's Customer Account API takes the raw access token here —
      // no "Bearer " prefix (confirmed against current Shopify docs).
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Customer Account API HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchCustomerProfile(): Promise<CustomerAccountProfile> {
  const result = await customerAccountFetch<CustomerProfileQueryResult>(CUSTOMER_PROFILE_QUERY);
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.message).join('; '));
  const customer = result.data?.customer;
  if (!customer) throw new Error('Customer Account API returned no customer');

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.emailAddress?.emailAddress ?? null,
    defaultAddress: customer.defaultAddress,
    orders: customer.orders.edges.map((e) => e.node),
  };
}
