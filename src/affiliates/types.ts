export type PayoutMethod = 'paypal' | 'bank' | 'payoneer';

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed_refund';

export interface AffiliateProfile {
  userId: string;
  code: string;
  customCode?: string;
  commissionRatePercent: number; // default 30%
  totalClicks: number;
  totalSignups: number;
  activePayingCustomers: number;
  pendingBalance: number;
  approvedBalance: number;
  paidEarningsTotal: number;
  payoutMethod?: PayoutMethod;
  payoutAccountMasked?: string; // e.g. "pa***@gmail.com"
  payoutAccountEncrypted?: string;
  createdAt: string;
}

export interface CommissionItem {
  id: string;
  affiliateUserId: string;
  referredUserId: string;
  referredUserEmailMasked: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number; // 30% of orderAmount
  planName: string;
  status: CommissionStatus;
  createdAt: string;
  approvedAt?: string;
}

export interface PayoutRequest {
  id: string;
  affiliateUserId: string;
  affiliateEmail: string;
  amount: number;
  method: PayoutMethod;
  accountDetailsMasked: string;
  status: 'pending' | 'completed' | 'rejected';
  referenceNumber?: string;
  requestedAt: string;
  processedAt?: string;
}
