/**
 * Fleet & courtesy cars — client types + label helpers for the mobile app (mirror the API's view objects
 * and the legacy "In N Out" vocabulary).
 */

export type FleetVehicleStatus = 'available' | 'out' | 'booked' | 'repair' | 'unknown';
export type FleetMovementStatus = 'active' | 'returned' | 'closed';
export type FleetBookingStatus = 'booked' | 'active' | 'completed' | 'cancelled';

export const PURPOSE_OPTIONS = ['COURTESY', 'RENT', 'REPAIRS', 'TOWED', 'SWAP', 'PICKUP', 'OTHER'];

export interface FleetVehicle {
  id: string;
  rego: string;
  regoRaw: string;
  make: string;
  model: string;
  vehicleType: string;
  status: FleetVehicleStatus;
  isCompanyCar: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetMovement {
  id: string;
  contactId: string | null;
  driverName: string;
  driverPhone: string;
  ownerName: string;
  ownerPhone: string;
  carsInRego: string;
  carsInRegoRaw: string;
  carsOutVehicleId: string | null;
  carsOutRego: string;
  carsOutRegoRaw: string;
  purpose: string;
  movedAt: string | null;
  status: FleetMovementStatus;
  needsReview: boolean;
  reviewReason: string;
  notes: string;
  staffName: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FleetReturn {
  id: string;
  movementId: string | null;
  returnedRego: string;
  driverName: string;
  mobileNumber: string;
  returnedAt: string | null;
  bondStatus: string;
  notes: string;
  needsReview: boolean;
  createdAt: string;
}

export interface FleetBooking {
  id: string;
  vehicleId: string | null;
  vehicleRego: string;
  bookingName: string;
  bookingMobile: string;
  startAt: string;
  expectedReturnAt: string | null;
  purpose: string;
  status: FleetBookingStatus;
  notes: string;
  createdAt: string;
}

export interface FleetPhoto {
  id: string;
  movementId: string | null;
  returnId: string | null;
  bookingId: string | null;
  vehicleId: string | null;
  photoType: string;
  contentType: string;
  notes: string;
  uploadedAt: string;
}

export interface FleetDashboardStats {
  carsOut: number;
  returnedToday: number;
  goingOutToday: number;
  availableCars: number;
  bookedCars: number;
  overdue: number;
  needsAttention: number;
}

export interface RentalPeriod {
  id: string;
  movementId: string | null;
  returnId: string | null;
  driverName: string;
  driverPhone: string;
  purpose: string;
  outAt: string | null;
  backAt: string | null;
  ongoing: boolean;
  notes: string;
  returnNotes: string;
}

export interface FleetSearchResults {
  movements: FleetMovement[];
  returns: FleetReturn[];
  vehicles: FleetVehicle[];
  bookings: FleetBooking[];
}

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'muted';

export const vehicleStatusLabel: Record<FleetVehicleStatus, string> = {
  available: 'Available',
  out: 'Out',
  booked: 'Booked',
  repair: 'In repair',
  unknown: 'Review',
};
export const vehicleStatusTone: Record<FleetVehicleStatus, Tone> = {
  available: 'success',
  out: 'danger',
  booked: 'warning',
  repair: 'accent',
  unknown: 'muted',
};

export const movementStatusLabel: Record<FleetMovementStatus, string> = {
  active: 'Out now',
  returned: 'Returned',
  closed: 'Closed',
};

export const bookingStatusLabel: Record<FleetBookingStatus, string> = {
  booked: 'Booked',
  active: 'Picked up',
  completed: 'Returned',
  cancelled: 'Cancelled',
};
export const bookingStatusTone: Record<FleetBookingStatus, Tone> = {
  booked: 'warning',
  active: 'danger',
  completed: 'success',
  cancelled: 'muted',
};

export const purposeLabel = (p: string) => (p ? p.charAt(0) + p.slice(1).toLowerCase() : '—');

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
