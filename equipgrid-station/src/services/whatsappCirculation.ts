/**
 * WhatsApp Notification & Manual Circulation Service for EquipGrid
 * Formats rich messages and generates one-click wa.me direct links for station ops.
 */

import { Booking, DispatchRecord, ReturnInspection } from '../types';

export function cleanIndianPhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 10 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits || '919450000000';
}

function formatINR(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 1. Booking Confirmation & Payment Verified Message
 */
export function getBookingWhatsAppMessage(booking: Booking, customRef?: string): string {
  const advancePaid = booking.advancePaid || booking.baseRent || 0;
  const depositPaid = booking.depositPaid || booking.depositAmount || 0;
  const totalPaid = advancePaid + depositPaid;

  return `🌾 *EquipGrid Booking & Payment Confirmed* 🚜
━━━━━━━━━━━━━━━━━━━━━━
Dear ${booking.customer.fullName},
Your machinery reservation *${booking.bookingNumber}* is confirmed and payment has been verified!

🚜 *Machine:* ${booking.asset.name} (\`${booking.asset.assetTag}\`)
📅 *Rental Dates:* ${booking.startDate} to ${booking.endDate}
📍 *Delivery Site:* ${booking.deliveryAddress || booking.customer.address}

💳 *Payment Breakdown:*
• Advance Rent: *${formatINR(advancePaid)}* (Paid)
• Security Deposit: *${formatINR(depositPaid)}* (100% Refundable Escrow)
━━━━━━━━━━━━━━━━━━━━━━
💰 *Total Paid:* *${formatINR(totalPaid)}*
✅ *Status:* *DISPATCH READY*

📄 *Attached Voucher:*
• Booking Receipt Voucher: *VCR-${booking.bookingNumber}*
• Handover Pass: Active
${customRef ? `• Payment Ref: ${customRef}\n` : ''}
Our yard operations team is staging the machine. You will receive a dispatch alert with driver and vehicle details as soon as it leaves the yard.

📞 Helpline: +91 94500 00000
🌐 EquipGrid Stations`;
}

/**
 * 2. Yard Handover Delivery Challan Message
 */
export function getDispatchWhatsAppMessage(booking: Booking, challan: DispatchRecord): string {
  return `🚚 *Machinery Dispatched from Yard!* 🚜
━━━━━━━━━━━━━━━━━━━━━━
Dear ${booking.customer.fullName},
Your rented machine is dispatched and en route to your site!

📄 *Challan No:* *${challan.challanNumber}*
🔖 *Booking Ref:* *${booking.bookingNumber}*
🚜 *Equipment:* ${booking.asset.name} (\`${booking.asset.assetTag}\`)
👨‍✈️ *Transporter / Driver:* ${challan.driverName || 'Suraj Logistics (E-Rickshaw 3W)'}
⛽ *Outgoing Fuel:* ${challan.fuelLevel || '100% (Full Tank)'}
⏱ *Meter Reading:* ${challan.engineHoursOut || 14.5} hrs
📍 *Site Destination:* ${booking.deliveryAddress}

✅ *28-point mechanical checks & accessories verified.*
Handover Delivery Challan (DC) is active.

Please ensure the unloading space and designated operator are ready.
Reply *TRACK* or *3* anytime to check live delivery trip status.

📞 Station Dispatch Desk: +91 94500 00000`;
}

/**
 * 3. Return Inspection & Security Deposit Settlement Message
 */
export function getReturnSettlementWhatsAppMessage(
  booking: Booking,
  inspection: ReturnInspection,
  settlement: {
    originalDeposit: number;
    fuelDeltaCharge: number;
    damageCost: number;
    netRefund: number;
    damageDescription?: string;
  }
): string {
  const notes = settlement.damageDescription || inspection.damageDescription || 'Machine in satisfactory working condition.';

  return `✅ *Return Inspection & Deposit Settlement Completed!* 🌾
━━━━━━━━━━━━━━━━━━━━━━
Dear ${booking.customer.fullName},
Your rented machine *${booking.asset.name}* (\`${booking.asset.assetTag}\`) has completed return yard inspection.

📋 *Booking Ref:* *${booking.bookingNumber}*
🔍 *Inspection Audit:* ${notes}

📊 *Security Deposit Settlement Statement:*
• Original Deposit Held: *${formatINR(settlement.originalDeposit)}*
• Fuel Surcharge: -${formatINR(settlement.fuelDeltaCharge)}
• Damage / Repair Deductions: -${formatINR(settlement.damageCost)}
━━━━━━━━━━━━━━━━━━━━━━
💰 *Net Refund to Customer: ${formatINR(settlement.netRefund)}*

🏦 *Refund Status:* *INITIATED / CREDITED*
📱 UPI Linked Mobile: +91 ${booking.customer.phone}
🧾 Voucher Reference: *F-004-SET-${booking.bookingNumber}*

Thank you for choosing EquipGrid! We look forward to serving your next project.

📞 Accounts & Settlement Desk: +91 94500 00000`;
}

/**
 * Opens WhatsApp Web or App directly with recipient phone & prefilled message
 */
export function openWhatsAppCirculation(phoneNumber: string, message: string): void {
  const cleanPhone = cleanIndianPhoneNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Copies text to clipboard
 */
export async function copyMessageToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
