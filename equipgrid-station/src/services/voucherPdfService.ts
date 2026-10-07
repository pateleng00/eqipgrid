/**
 * Voucher and PDF Print Service for EquipGrid
 * Generates official, print-ready documents and PDF vouchers for:
 * 1. Booking Confirmation & Payment Receipt (Voucher BK-xxx)
 * 2. Yard Handover Delivery Challan (Challan DC-xxx)
 * 3. Return Inspection & Security Deposit Settlement Receipt (Form F-004)
 */

import { Booking, DispatchRecord, ReturnInspection } from '../types';

export interface BookingVoucherData {
  booking: Booking;
  advancePaid?: number;
  depositPaid?: number;
  totalPaid?: number;
  paymentMode?: string;
  transactionRef?: string;
  issuedAt?: string;
  stationName?: string;
}

export interface DispatchVoucherData {
  booking: Booking;
  challan: DispatchRecord;
  issuedAt?: string;
  stationName?: string;
}

export interface SettlementVoucherData {
  booking: Booking;
  inspection: ReturnInspection;
  originalDeposit: number;
  fuelDeltaCharge: number;
  damageCost: number;
  damageNotes?: string;
  netRefund: number;
  refundDestination?: string;
  inspectorName: string;
  issuedAt?: string;
  stationName?: string;
}

function formatINR(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLogoUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/logo-rectangle.png`;
  }
  return '/logo-rectangle.png';
}

const COMMON_CSS = `
  @page {
    size: A4 portrait;
    margin: 14mm 16mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 24px;
    font-size: 13px;
    line-height: 1.5;
  }
  .doc-container {
    max-width: 800px;
    margin: 0 auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 32px;
    background: #ffffff;
  }
  @media print {
    body { padding: 0; }
    .doc-container { border: none; padding: 0; border-radius: 0; }
    .no-print { display: none !important; }
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #f59e0b;
    padding-bottom: 18px;
    margin-bottom: 24px;
  }
  .brand-logo {
    height: 68px;
    width: auto;
    max-width: 270px;
    object-fit: contain;
    object-position: left center;
    display: block;
    margin-bottom: 6px;
  }
  .brand-title {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.5px;
    color: #0f172a;
  }
  .brand-title span {
    color: #d97706;
  }
  .brand-sub {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 1px;
    margin-top: 2px;
  }
  .voucher-badge {
    text-align: right;
  }
  .badge-tag {
    display: inline-block;
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 800;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-emerald { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .badge-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .badge-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
  .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .voucher-no {
    font-family: monospace;
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 6px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }
  .panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .panel-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #64748b;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
  }
  .info-label { color: #64748b; font-weight: 500; }
  .info-val { font-weight: 700; color: #0f172a; text-align: right; }
  table.ledger-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 12px;
  }
  table.ledger-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 9px 12px;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  table.ledger-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  table.ledger-table tr:last-child td {
    border-bottom: 2px solid #0f172a;
  }
  .total-row {
    background: #f8fafc;
    font-weight: 800;
    font-size: 13px;
  }
  .footer {
    border-top: 1px dashed #cbd5e1;
    padding-top: 18px;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .terms {
    font-size: 10px;
    color: #64748b;
    max-width: 480px;
    line-height: 1.4;
  }
  .sign-box {
    text-align: center;
    border-top: 1px solid #0f172a;
    padding-top: 6px;
    width: 160px;
    font-size: 10px;
    font-weight: 700;
    color: #334155;
  }
  .official-seal {
    display: inline-block;
    border: 2px solid #059669;
    color: #059669;
    font-weight: 900;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 6px;
  }
  .print-btn-bar {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0f172a;
    color: #ffffff;
    padding: 10px 18px;
    border-radius: 50px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    display: flex;
    gap: 10px;
    z-index: 9999;
  }
  .btn-print {
    background: #f59e0b;
    color: #0f172a;
    border: none;
    padding: 7px 16px;
    border-radius: 20px;
    font-weight: 800;
    cursor: pointer;
    font-size: 12px;
  }
  .btn-close {
    background: #334155;
    color: #ffffff;
    border: none;
    padding: 7px 14px;
    border-radius: 20px;
    font-weight: 700;
    cursor: pointer;
    font-size: 12px;
  }
`;

function openPrintWindow(title: string, bodyHtml: string) {
  const win = window.open('', '_blank', 'width=880,height=900,menubar=no,toolbar=no,location=no,status=no');
  if (!win) {
    alert('Pop-up window blocked. Please allow popups to view and print the voucher.');
    return;
  }

  const baseOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${baseOrigin ? `<base href="${baseOrigin}/">` : ''}
  <title>${escapeHtml(title)}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
  <div class="doc-container">
    ${bodyHtml}
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

/**
 * 1. Booking Confirmation & Payment Receipt
 */
export function printBookingConfirmationPdf(data: BookingVoucherData) {
  const { booking } = data;
  const advancePaid = data.advancePaid ?? booking.advancePaid ?? (booking.baseRent || 0);
  const depositPaid = data.depositPaid ?? booking.depositPaid ?? (booking.depositAmount || 0);
  const totalPaid = data.totalPaid ?? (advancePaid + depositPaid);
  const nowStr = data.issuedAt || new Date().toLocaleString('en-IN');
  const stationName = data.stationName || (booking.asset?.hubName ? `${booking.asset.hubName} Hub` : 'EquipGrid Hardoi Central Hub');

  const bodyHtml = `
    <div class="header">
      <div>
        <img src="${getLogoUrl()}" alt="EquipGrid" class="brand-logo" onerror="this.onerror=null; this.src='/logo-rectangle.png';" />
        <div class="brand-sub">Agricultural & Construction Equipment Rental Station</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">${escapeHtml(stationName)} · Helpline: +91 94500 00000</div>
      </div>
      <div class="voucher-badge">
        <span class="badge-tag badge-emerald">Booking Confirmed & Verified</span>
        <div class="voucher-no">${escapeHtml(booking.bookingNumber)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Date: ${escapeHtml(nowStr)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">Customer Information</div>
        <div class="info-row"><span class="info-label">Full Name:</span><span class="info-val">${escapeHtml(booking.customer.fullName)}</span></div>
        <div class="info-row"><span class="info-label">Mobile (WhatsApp):</span><span class="info-val">+91 ${escapeHtml(booking.customer.phone)}</span></div>
        <div class="info-row"><span class="info-label">Delivery Address:</span><span class="info-val" style="max-width: 180px;">${escapeHtml(booking.deliveryAddress || booking.customer.address)}</span></div>
        <div class="info-row"><span class="info-label">Distance from Hub:</span><span class="info-val">${booking.distanceKm || 12} km</span></div>
      </div>

      <div class="panel">
        <div class="panel-title">Machinery Specification</div>
        <div class="info-row"><span class="info-label">Machine Name:</span><span class="info-val">${escapeHtml(booking.asset.name)}</span></div>
        <div class="info-row"><span class="info-label">Asset Tag:</span><span class="info-val" style="font-family: monospace; color: #b45309;">${escapeHtml(booking.asset.assetTag)}</span></div>
        <div class="info-row"><span class="info-label">Category / Model:</span><span class="info-val">${escapeHtml(booking.asset.modelName || 'Standard Heavy Duty')}</span></div>
        <div class="info-row"><span class="info-label">Rental Duration:</span><span class="info-val">${escapeHtml(booking.startDate)} to ${escapeHtml(booking.endDate)}</span></div>
      </div>
    </div>

    <table class="ledger-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty / Duration</th>
          <th style="text-align: right;">Rate (₹)</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Equipment Base Rental</strong>
            <div style="font-size: 11px; color: #64748b;">${escapeHtml(booking.asset.name)} · Daily Operation Rate</div>
          </td>
          <td style="text-align: center;">${escapeHtml(booking.startDate)} → ${escapeHtml(booking.endDate)}</td>
          <td style="text-align: right;">${formatINR(booking.asset.dailyRate)} / day</td>
          <td style="text-align: right;">${formatINR(booking.baseRent)}</td>
        </tr>
        <tr>
          <td>
            <strong>Security Deposit (100% Refundable Escrow)</strong>
            <div style="font-size: 11px; color: #64748b;">Refunded to customer upon yard return inspection</div>
          </td>
          <td style="text-align: center;">Escrow Deposit</td>
          <td style="text-align: right;">—</td>
          <td style="text-align: right;">${formatINR(booking.depositAmount)}</td>
        </tr>
        ${booking.deliveryFee ? `
        <tr>
          <td><strong>Logistics & Flatbed Delivery Fee</strong></td>
          <td style="text-align: center;">To Site (${booking.distanceKm || 12} km)</td>
          <td style="text-align: right;">—</td>
          <td style="text-align: right;">${formatINR(booking.deliveryFee)}</td>
        </tr>` : ''}
        ${booking.operatorFee ? `
        <tr>
          <td><strong>Certified Machinery Operator Allowance</strong></td>
          <td style="text-align: center;">Full Duty</td>
          <td style="text-align: right;">—</td>
          <td style="text-align: right;">${formatINR(booking.operatorFee)}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td colspan="3"><strong>Total Advance Required & Barrier</strong></td>
          <td style="text-align: right;"><strong>${formatINR(booking.totalAmount)}</strong></td>
        </tr>
        <tr style="background: #ecfdf5; font-weight: 800;">
          <td colspan="3" style="color: #047857;">
            ✅ Total Amount Received (${escapeHtml(data.paymentMode || 'UPI')} · Ref: ${escapeHtml(data.transactionRef || 'VERIFIED')})
          </td>
          <td style="text-align: right; color: #047857;">${formatINR(totalPaid)}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px;">
      <div>
        <span class="official-seal">PAID & DISPATCH READY</span>
        <div style="font-size: 11px; color: #065f46; margin-top: 4px; font-weight: 600;">Zero-Open-Credit Verified. Machine authorized for yard handover.</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #64748b;">Balance Due Before Dispatch:</div>
        <div style="font-size: 16px; font-weight: 900; color: #047857; font-family: monospace;">₹0.00</div>
      </div>
    </div>

    <div class="footer">
      <div class="terms">
        <strong>Terms & Conditions:</strong><br>
        1. Standard duration for which machine will be given to customer is 8:00 hours (+ 1:00 hour buffer allowed without any extra cost). Beyond 9:00 hours total, the per hour charge will be levied and deducted from security.<br>
        2. Total hours calculation will start from the time of machinery handed-over to customer at site.<br>
        3. Pre-dispatch fuel level must be maintained or fuel surcharge will be adjusted from security deposit.<br>
        4. In case of any damage to the machinery during the rental period, the cost of repair will be deducted from deposit.<br>
        5. Balance security deposit will be refunded within 15 minutes of return inspection at the hub yard.<br>
        6. Official digital receipt generated by EquipGrid Platform, hence no signature required.<br>
      </div>
      <div class="sign-box">
        Authorized Station Seal<br>
        <span style="font-family: monospace; font-size: 9px; color: #64748b;">${escapeHtml(booking.bookingNumber)}</span>
      </div>
    </div>
  `;

  openPrintWindow(`Booking_Confirmation_${booking.bookingNumber}`, bodyHtml);
}

/**
 * 2. Yard Handover Delivery Challan (Challan DC-xxx)
 */
export function printDispatchChallanPdf(data: DispatchVoucherData) {
  const { booking, challan } = data;
  const nowStr = data.issuedAt || new Date().toLocaleString('en-IN');
  const stationName = data.stationName || (booking.asset?.hubName ? `${booking.asset.hubName} Hub` : 'EquipGrid Hardoi Central Hub');

  const bodyHtml = `
    <div class="header">
      <div>
        <img src="${getLogoUrl()}" alt="EquipGrid" class="brand-logo" onerror="this.onerror=null; this.src='/logo-rectangle.png';" />
        <div class="brand-sub">Machinery Delivery Challan & Handover Pass (Gate Pass)</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">${escapeHtml(stationName)}</div>
      </div>
      <div class="voucher-badge">
        <span class="badge-tag badge-blue">Yard Handover Active</span>
        <div class="voucher-no">${escapeHtml(challan.challanNumber)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Dispatched: ${escapeHtml(nowStr)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">Customer & Destination</div>
        <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${escapeHtml(booking.customer.fullName)}</span></div>
        <div class="info-row"><span class="info-label">WhatsApp Contact:</span><span class="info-val">+91 ${escapeHtml(booking.customer.phone)}</span></div>
        <div class="info-row"><span class="info-label">Destination Farm/Site:</span><span class="info-val">${escapeHtml(booking.deliveryAddress)}</span></div>
        <div class="info-row"><span class="info-label">Booking Reference:</span><span class="info-val" style="font-family: monospace;">${escapeHtml(booking.bookingNumber)}</span></div>
      </div>

      <div class="panel">
        <div class="panel-title">Dispatch Vehicle & Driver</div>
        <div class="info-row"><span class="info-label">Transporter / Driver:</span><span class="info-val">${escapeHtml(challan.driverName || 'Suraj Logistics (E-Rickshaw 3W)')}</span></div>
        <div class="info-row"><span class="info-label">Machine Asset Tag:</span><span class="info-val" style="font-family: monospace; color: #b45309;">${escapeHtml(challan.assetTag || booking.asset.assetTag)}</span></div>
        <div class="info-row"><span class="info-label">Outgoing Fuel Level:</span><span class="info-val" style="color: #047857;">${escapeHtml(challan.fuelLevel || '100% (Full Tank)')}</span></div>
        <div class="info-row"><span class="info-label">Meter Reading Out:</span><span class="info-val">${challan.engineHoursOut || 14.5} hrs</span></div>
      </div>
    </div>

    <div class="panel" style="margin-bottom: 20px;">
      <div class="panel-title">28-Point Pre-Dispatch Mechanical & Safety Audit</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-top: 6px;">
        <div>✅ Engine Oil & Coolant Levels Verified</div>
        <div>✅ All Grease Points & Moving Joints Serviced</div>
        <div>✅ High-Pressure Hose / Cables Tested</div>
        <div>✅ Emergency Stop & Guard Switches Tested</div>
        <div>✅ Standard Tool Kit & Accessories Included</div>
        <div>✅ Driver Handover & Site Safety Protocol Briefed</div>
      </div>
      ${challan.conditionNotes ? `
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
        <strong>Yard Handover Notes:</strong> ${escapeHtml(challan.conditionNotes)}
      </div>` : ''}
    </div>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 11px; line-height: 1.5; color: #92400e;">
      <strong>⚠️ Shift Hours & Overtime Policy:</strong><br>
      Standard hours for which machine will be given to customer is 8 once it reaches and handed over to customer (+ 1 hour buffer allowed without extra cost). Beyond 9 hours total, the per hour charge will be levied and deducted from security. Customer acceptance signature confirms agreement to these operational terms.
    </div>

    <div class="footer">
      <div class="sign-box">
        Yard Technician Signature<br>
        <span style="font-size: 9px; color: #64748b;">EquipGrid Logistics</span>
      </div>
      <div class="sign-box">
        Transporter / Driver Signature<br>
        <span style="font-size: 9px; color: #64748b;">${escapeHtml(challan.driverName || 'Driver')}</span>
      </div>
      <div class="sign-box">
        Customer Acceptance Signature<br>
        <span style="font-size: 9px; color: #64748b;">At Delivery Unloading</span>
      </div>
    </div>
  `;

  openPrintWindow(`Delivery_Challan_${challan.challanNumber}`, bodyHtml);
}

/**
 * 3. Return Inspection & Security Deposit Settlement Receipt (Form F-004)
 */
export function printReturnSettlementPdf(data: SettlementVoucherData) {
  const { booking, inspection } = data;
  const nowStr = data.issuedAt || new Date().toLocaleString('en-IN');
  const stationName = data.stationName || (booking.asset?.hubName ? `${booking.asset.hubName} Hub` : 'EquipGrid Hardoi Central Hub');

  const bodyHtml = `
    <div class="header">
      <div>
        <img src="${getLogoUrl()}" alt="EquipGrid" class="brand-logo" onerror="this.onerror=null; this.src='/logo-rectangle.png';" />
        <div class="brand-sub">Return Inspection Audit & Deposit Settlement Statement (Form F-004)</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">${escapeHtml(stationName)}</div>
      </div>
      <div class="voucher-badge">
        <span class="badge-tag badge-purple">Settlement Complete</span>
        <div class="voucher-no">F-004-SET-${escapeHtml(booking.bookingNumber)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Settled: ${escapeHtml(nowStr)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">Customer & Booking Details</div>
        <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${escapeHtml(booking.customer.fullName)}</span></div>
        <div class="info-row"><span class="info-label">UPI / Mobile Ref:</span><span class="info-val">+91 ${escapeHtml(data.refundDestination || booking.customer.phone)}</span></div>
        <div class="info-row"><span class="info-label">Booking Reference:</span><span class="info-val" style="font-family: monospace;">${escapeHtml(booking.bookingNumber)}</span></div>
        <div class="info-row"><span class="info-label">Rental Duration:</span><span class="info-val">${escapeHtml(booking.startDate)} → ${escapeHtml(booking.endDate)}</span></div>
      </div>

      <div class="panel">
        <div class="panel-title">Inward Yard Audit Information</div>
        <div class="info-row"><span class="info-label">Machine:</span><span class="info-val">${escapeHtml(booking.asset.name)}</span></div>
        <div class="info-row"><span class="info-label">Asset Tag:</span><span class="info-val" style="font-family: monospace; color: #b45309;">${escapeHtml(booking.asset.assetTag)}</span></div>
        <div class="info-row"><span class="info-label">Inspected By:</span><span class="info-val">${escapeHtml(data.inspectorName || 'Rajesh Sharma (Lead Tech)')}</span></div>
        <div class="info-row"><span class="info-label">Status Post-Return:</span><span class="info-val">${data.damageCost > 0 ? 'ROUTED TO MAINTENANCE' : 'RETURNED TO YARD (AVAILABLE)'}</span></div>
      </div>
    </div>

    <table class="ledger-table">
      <thead>
        <tr>
          <th>Settlement Component</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Original Security Deposit Held in Escrow</strong>
            <div style="font-size: 11px; color: #64748b;">Collected at booking confirmation</div>
          </td>
          <td style="text-align: right; font-weight: 700;">+${formatINR(data.originalDeposit)}</td>
        </tr>
        <tr>
          <td>
            <strong>Fuel Surcharge / Delta Adjustment</strong>
            <div style="font-size: 11px; color: #64748b;">Tank refueling delta at return check-in</div>
          </td>
          <td style="text-align: right; color: ${data.fuelDeltaCharge > 0 ? '#b91c1c' : '#64748b'};">
            ${data.fuelDeltaCharge > 0 ? `-${formatINR(data.fuelDeltaCharge)}` : '₹0.00 (Full Tank)'}
          </td>
        </tr>
        <tr>
          <td>
            <strong>Mechanical Damage / Repair Deductions</strong>
            <div style="font-size: 11px; color: #64748b;">${escapeHtml(data.damageNotes || 'No mechanical damages observed. Machine clean.')}</div>
          </td>
          <td style="text-align: right; color: ${data.damageCost > 0 ? '#b91c1c' : '#64748b'};">
            ${data.damageCost > 0 ? `-${formatINR(data.damageCost)}` : '₹0.00 (No Damage)'}
          </td>
        </tr>
        <tr class="total-row" style="background: #ecfdf5;">
          <td>
            <strong style="color: #047857; font-size: 14px;">Net Security Deposit Refund to Customer</strong>
            <div style="font-size: 11px; color: #065f46;">Initiated via UPI Autopay / Immediate Transfer to +91 ${escapeHtml(booking.customer.phone)}</div>
          </td>
          <td style="text-align: right; color: #047857; font-size: 18px; font-weight: 900; font-family: monospace;">
            ${formatINR(data.netRefund)}
          </td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 11px; line-height: 1.5;">
      <strong>Audit Summary & Closure:</strong><br>
      The equipment has undergone full core technical verification. Standard hours for which machine is given to customer is 8 once it reaches and is handed over to customer (+ 1 hour buffer allowed without extra cost); any operating hours beyond 9 hours are levied per hour and deducted from security. Any deposit deductions reflect actual overtime, refurbishment, and fuel delta costs per rental policy. The rental contract for ${escapeHtml(booking.bookingNumber)} is formally closed with zero balance outstanding.
    </div>

    <div class="footer">
      <div class="sign-box">
        Hub Technical Inspector<br>
        <span style="font-size: 9px; color: #64748b;">${escapeHtml(data.inspectorName || 'Rajesh Sharma')}</span>
      </div>
      <div class="sign-box">
        Accounts Desk Clearance<br>
        <span style="font-size: 9px; color: #64748b;">UPI Disbursal Officer</span>
      </div>
      <div class="sign-box">
        Customer Acceptance<br>
        <span style="font-size: 9px; color: #64748b;">+91 ${escapeHtml(booking.customer.phone)}</span>
      </div>
    </div>
  `;

  openPrintWindow(`Settlement_Voucher_${booking.bookingNumber}`, bodyHtml);
}
