/**
 * API types — the shapes the OneStack API returns, mirrored for the mobile client. Kept deliberately
 * close to the web app's usage so screens can reach parity. Not exhaustive; extended as screens are built.
 */

export type AppRole = 'OWNER' | 'STAFF';

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: AppRole;
}

export interface WorkItem {
  id: string;
  type: string;
  reference: string;
  stateName: string;
  workflowVersion: number;
  assignees: string[];
  fields: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt?: string;
  subjects?: Vehicle[];
}

export interface Contact {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  fields: Record<string, unknown>;
  customFields: Record<string, unknown>;
  createdAt: string;
}

/**
 * A vehicle is a pack Subject: the make/model/rego/year live inside `fields` (not top-level), and `label`
 * is the pre-formatted display string. Use vehicleLine()/vehicleRego() to read them safely.
 */
export interface Vehicle {
  id: string;
  type: string;
  label: string;
  fields: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  contactId: string | null;
}

function f(v: Vehicle, key: string): string {
  const val = v.fields?.[key];
  return val == null ? '' : String(val);
}

/** "2021 Mazda CX-5" from a vehicle's fields, falling back to its label. */
export function vehicleLine(v: Vehicle): string {
  const line = [f(v, 'year'), f(v, 'make'), f(v, 'model')].filter(Boolean).join(' ').trim();
  return line || v.label || 'Vehicle';
}

export function vehicleRego(v: Vehicle): string {
  return f(v, 'rego');
}

export interface QuoteLine {
  id: string;
  description: string;
  type: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface Quote {
  id: string;
  reference: string;
  status: string;
  workItemId: string;
  revision: number;
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  lines?: QuoteLine[];
}

export interface InvoiceLine {
  id: string;
  description: string;
  type: string;
  quantity: number;
  unitPriceCents: number;
  netCents: number;
  gstCents: number;
  lineTotalCents: number;
}

export interface Payment {
  id: string;
  amountCents: number;
  method: string;
  receivedAt: string;
}

export interface Invoice {
  id: string;
  reference: string;
  status: string;
  workItemId: string;
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  paidState?: 'Unpaid' | 'PartiallyPaid' | 'Paid' | 'Overpaid';
  dueDate: string | null;
  paidAt: string | null;
  lines?: InvoiceLine[];
  payments?: Payment[];
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
  authorUserId?: string | null;
}

export interface Attachment {
  id: string;
  workItemId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedByUserId: string;
  createdAt: string;
}

export type DamageOperation = string;

export interface DamageScopeItem {
  id: string;
  panel: string;
  operation: DamageOperation;
  note: string | null;
  confidence: number | null;
}

export interface DamageScope {
  id: string;
  workItemId: string;
  status: 'draft' | 'applied';
  source: 'ai' | 'manual';
  model: string;
  summary: string;
  photoCount: number;
  items: DamageScopeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ScopePart {
  id: string;
  workItemId: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  source: 'ai' | 'manual';
  sortOrder: number;
}

export interface DashboardSummary {
  jobsByState: Record<string, number>;
  activeJobs: number;
  totalUnpaidCents: number;
  thisWeekRevenueCents: number;
  weekStart: string;
}

export interface Resource {
  id: string;
  type: 'bay' | 'technician';
  name: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  workItemId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
}

export type LeadStatus = 'New' | 'Contacted' | 'Converted';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  vehicleInfo: string | null;
  source: string;
  status: LeadStatus;
  convertedContactId: string | null;
  createdAt: string;
}

export interface PriceBookItem {
  id: string;
  name: string;
  description: string | null;
  type: 'labour' | 'part';
  unit: 'hour' | 'each';
  defaultUnitPriceCents: number;
  code: string | null;
  active: boolean;
}

export interface ClaimBlock {
  insurer: string;
  claimNumber: string;
  assessor: string | null;
  dateLodged: string | null;
  authorisedAmountCents: number | null;
  excessCents: number | null;
  billPayer: string | null;
}

export interface ClaimDocument {
  id: string;
  type: string;
  parentType: string;
  templateRef: string;
  templateVersion: string;
}

export interface ClaimFile {
  job: { id: string; reference: string; stateName: string; description: string | null };
  claim: ClaimBlock | null;
  customer: { id: string; displayName: string; email: string | null; phone: string | null } | null;
  insurer: { id: string; displayName: string } | null;
  vehicles: { id: string; label: string }[];
  photos: { id: string; fileName: string; caption: string | null; contentType: string; createdAt: string }[];
  quotes: { id: string; reference: string; status: string; revision: number; totalCents: number }[];
  invoices: { id: string; reference: string; status: string; totalCents: number; paidCents: number; balanceCents: number }[];
  documents: ClaimDocument[];
  counts: { photos: number; quotes: number; invoices: number; documents: number };
  financials: { invoicedCents: number; paidCents: number; outstandingCents: number };
}

export interface ShareResult {
  shared: boolean;
  url: string | null;
  reason?: string;
}

export interface Integration {
  slug: string;
  name: string;
  category: string;
  description: string;
  available: boolean;
  status: 'connected' | 'disconnected' | 'not_connected';
  connectedAt: string | null;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  eventType: string;
  status: 'success' | 'failed';
  responseCode: number | null;
  error: string | null;
  createdAt: string;
}

export interface SaleLine {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface Sale {
  id: string;
  reference: string;
  contactId: string | null;
  status: 'open' | 'completed' | 'void';
  tenderType: string | null;
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  createdAt: string;
  completedAt: string | null;
  lines: SaleLine[];
}

export interface Referral {
  id: string;
  referrerContactId: string;
  referredName: string;
  referredPhone: string | null;
  referredContactId: string | null;
  status: 'pending' | 'converted' | 'rewarded';
  rewardNote: string | null;
  createdAt: string;
}

export interface GiftCard {
  id: string;
  code: string;
  initialCents: number;
  balanceCents: number;
  status: 'active' | 'void';
  note: string | null;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  quantityOnHand: number;
  reorderLevel: number;
  parLevel: number;
  unitCostCents: number | null;
  active: boolean;
  lowStock: boolean;
  suggestedReorderQty: number;
}

export interface Shift {
  id: string;
  staffUserId: string | null;
  staffName: string;
  kind: 'shift' | 'time_off';
  startsAt: string;
  endsAt: string;
  notes: string | null;
}

export interface WaitlistEntry {
  id: string;
  contactId: string | null;
  name: string;
  phone: string;
  resourceId: string | null;
  notes: string | null;
  status: 'waiting' | 'booked' | 'removed';
  bookingId: string | null;
  createdAt: string;
}

export interface DuplicateGroup {
  reasons: ('phone' | 'email' | 'name')[];
  contacts: { id: string; displayName: string; email: string | null; phone: string | null }[];
}

export type CustomFieldTarget = 'customer' | 'vehicle';
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomField {
  id: string;
  appliesTo: CustomFieldTarget;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
  archived: boolean;
}

export interface BoardCard {
  id: string;
  reference: string;
  stateName: string;
  customerName: string | null;
  vehicleLabel: string | null;
  assignees: string[];
}

export interface BoardColumn {
  state: string;
  isFinal: boolean;
  cards: BoardCard[];
}

export interface BoardView {
  type: string;
  columns: BoardColumn[];
}

// ---- Time clock ----

export interface TimeEntry {
  id: string;
  userId: string;
  clockInAt: string;
  clockOutAt: string | null;
  minutes: number | null;
}

export interface ClockStatus {
  onClock: boolean;
  entry: TimeEntry | null;
}

export interface StaffTotal {
  userId: string;
  role: AppRole | null;
  totalMinutes: number;
  sessions: number;
  onClock: boolean;
  lastClockInAt: string | null;
}

export interface DirectoryEntry {
  userId: string;
  email: string | null;
  role: AppRole;
}

export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: AppRole;
}

/** Minutes → "3h 20m" / "45m". */
export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// ---------------------------------------------------------------- floor ordering (parts)

/** One requested material on a job. Mirrors the API's MaterialRequestLineView. */
export interface MaterialRequestLine {
  id: string;
  description: string;
  quantity: number;
  notes: string | null;
  sortOrder: number;
}

/**
 * A technician's parts request for a job. Mirrors the API's MaterialRequestView. Raised by STAFF;
 * approved/rejected/ordered by an OWNER (those routes are owner-only, so the app shows status only).
 */
export interface MaterialRequest {
  id: string;
  workItemId: string;
  reference: string;
  status: string;
  requestedByUserId: string;
  decidedByUserId: string | null;
  decisionNote: string | null;
  notes: string | null;
  lines: MaterialRequestLine[];
}
