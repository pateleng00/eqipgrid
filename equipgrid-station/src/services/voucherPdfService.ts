/**
 * Voucher and PDF Print Service for EquipGrid
 * Generates official, print-ready documents and PDF vouchers for:
 * 1. Booking Confirmation & Payment Receipt (Voucher BK-xxx)
 * 2. Yard Handover Delivery Challan (Challan DC-xxx)
 * 3. Return Inspection & Security Deposit Settlement Receipt (Form F-004)
 */

import { Booking, DispatchRecord, ReturnInspection, getFarmerFriendlyStatus, FarmLocation, getBillingUnitDisplayName, getBillingUnitShiftTerms, resolveBillingUnitCode } from '../types';

export interface BookingVoucherData {
  booking: Booking;
  advancePaid?: number;
  depositPaid?: number;
  totalPaid?: number;
  paymentMode?: string;
  transactionRef?: string;
  issuedAt?: string;
  stationName?: string;
  farmLocation?: FarmLocation;
}

export interface DispatchVoucherData {
  booking: Booking;
  challan: DispatchRecord;
  driverPhone?: string;
  vehicleNumber?: string;
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
  refundTransactionRef?: string;
  refundStatus?: string;
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

function getBookingSourceMeta(source?: string): { en: string; hi: string } {
  switch (source) {
    case 'PHONE_AGENT':
    case 'KISAN_MITRA':
      return { en: 'Kisan Mitra / Phone Desk', hi: 'किसान मित्र / फोन डेस्क' };
    case 'DEALER':
      return { en: 'Village Dealer / VLE Network', hi: 'ग्राम डीलर नेटवर्क' };
    case 'FPO':
      return { en: 'FPO Partner Channel', hi: 'एफपीओ पार्टनर चैनल' };
    case 'WHATSAPP':
      return { en: 'WhatsApp Rural Assistant', hi: 'व्हाट्सएप ग्रामीण सेवा' };
    case 'STATION':
    default:
      return { en: 'Hub Booking Desk', hi: 'केंद्र बुकिंग काउंटर' };
  }
}

function getDynamicBookingTerms(booking: Booking): string {
  const billingUnitCode = resolveBillingUnitCode(booking.asset?.billingUnit);
  const isZeroDeposit = Number(booking.depositAmount || 0) === 0;
  const isFreeDelivery = Number(booking.distanceKm || 0) <= 5 || Number(booking.deliveryFee || 0) === 0;

  let shiftPolicy = `1. <strong>${escapeHtml(getBillingUnitDisplayName(billingUnitCode))} Policy:</strong> ${escapeHtml(booking.asset?.shiftTerms || getBillingUnitShiftTerms(billingUnitCode))}`;
  if (billingUnitCode === 'DAILY') {
    shiftPolicy = '1. <strong>Standard Shift Policy (दैनिक कार्य समय):</strong> Machine rental duration is standard 8:00 hours (+ 1:00 hour complimentary grace buffer allowed at no extra cost). Beyond 9:00 hours total running time, pro-rata hourly rates apply.';
  } else if (billingUnitCode === 'HOURLY') {
    shiftPolicy = '1. <strong>Metered Run-Time Policy (प्रति घंटा मीटर दर):</strong> Billed strictly on actual engine/machine operating run hours. Pay only for actual runtime with zero daily minimum boundation.';
  } else if (billingUnitCode === 'PER_HOLE') {
    shiftPolicy = '1. <strong>Per Hole Drilling Policy (प्रति गड्ढा दर):</strong> Billed per actual hole drilled on site with standard bits. Zero shift or time restriction applies.';
  } else if (billingUnitCode === 'PER_TRIP') {
    shiftPolicy = '1. <strong>Per Trip Haulage Policy (प्रति चक्कर दर):</strong> Billed per completed transportation trip between designated dispatch yard and farm site.';
  } else if (billingUnitCode === 'PER_ACRE') {
    shiftPolicy = '1. <strong>Per Acre Field Policy (प्रति एकड़ दर):</strong> Billed per actual worked acreage as verified on GPS field perimeter.';
  } else if (billingUnitCode === 'PER_KM') {
    shiftPolicy = '1. <strong>Per Kilometer Transit Policy (प्रति किलोमीटर दर):</strong> Billed per actual transit haulage distance recorded on vehicle odometer.';
  } else if (billingUnitCode === 'PER_SHIFT') {
    shiftPolicy = '1. <strong>Per Shift Work Policy (प्रति शिफ्ट दर):</strong> Billed per standard 8-hour operator shift window.';
  } else if (billingUnitCode === 'PER_TON') {
    shiftPolicy = '1. <strong>Per Ton Material Handling Policy (प्रति टन दर):</strong> Billed per actual weighed tonnage loaded/handled.';
  } else if (billingUnitCode === 'MONTHLY') {
    shiftPolicy = '1. <strong>Monthly Lease Policy (मासिक पट्टा दर):</strong> Billed on 30-day scheduled rental cycles with dedicated maintenance coverage.';
  }

  const shiftTermsLine = booking.asset?.shiftTerms 
    ? `2. <strong>Special Equipment Terms (विशेष उपकरण शर्तें):</strong> ${escapeHtml(booking.asset.shiftTerms)}<br>`
    : '';

  const transitLine = isFreeDelivery
    ? '3. <strong>Logistics & Transit (निःशुल्क परिवहन):</strong> Delivery is within the 0–5 km free hub radius with zero logistics surcharge.<br>'
    : `3. <strong>Site Delivery & Transit:</strong> Delivery flatbed dispatched to farmer\'s saved location (${booking.distanceKm || 0} km). Clock starts upon on-site handover.<br>`;

  const depositLine = isZeroDeposit
    ? '4. <strong>Zero-Deposit Welfare Scheme (₹0 जमानत योजना):</strong> No security deposit is held in escrow. Overtime, fuel delta or repairs (if any) are settled directly via post-operation invoice.<br>'
    : '4. <strong>100% Refundable Escrow Deposit (अमानत राशि वापसी):</strong> 100% refundable balance is returned via UPI within 15 minutes of return inspection at the hub.<br>';

  const finalLine = '5. Official digital receipt generated by EquipGrid Platform Engine. No physical seal required.';

  return `
    <strong>Farmer-Friendly Terms & Operational Guidance (सरल नियम व शर्तें):</strong><br>
    ${shiftPolicy}<br>
    ${shiftTermsLine}
    ${transitLine}
    ${depositLine}
    ${finalLine}
  `;
}

function getDynamicDispatchPolicy(booking: Booking): string {
  const billingUnitCode = resolveBillingUnitCode(booking.asset?.billingUnit);
  const isZeroDeposit = Number(booking.depositAmount || 0) === 0;

  if (billingUnitCode === 'HOURLY') {
    return `<strong>⚠️ Metered Hourly Run-Time Policy (प्रति घंटा मीटर नियम):</strong><br>
      This machine is billed per actual engine meter run hours. Operator/driver and customer verify outgoing meter reading (${booking.asset.engineHours || 0} hrs). Operating time is calculated strictly from on-site start to return check-in. ${isZeroDeposit ? 'Zero deposit held.' : 'Refueling deltas adjusted upon return.'}`;
  } else if (billingUnitCode === 'PER_HOLE') {
    return `<strong>⚠️ Per Hole Drilling Policy (प्रति गड्ढा ड्रिलिंग नियम):</strong><br>
      Billed per actual hole drilled on site. Includes verified auger bits. Zero shift or time restriction applies. Customer acceptance signature confirms operational readiness.`;
  } else if (billingUnitCode === 'PER_TRIP') {
    return `<strong>⚠️ Per Trip Haulage Policy (परिवहन चक्कर नियम):</strong><br>
      Billed per completed transportation trip. Driver verifies safe delivery unloading at designated farm edge.`;
  } else if (billingUnitCode === 'PER_ACRE') {
    return `<strong>⚠️ Per Acre Agricultural Operation Policy (प्रति एकड़ खेत नियम):</strong><br>
      Billed per actual field acreage worked. Field handover verified upon arrival.`;
  } else if (billingUnitCode === 'PER_KM') {
    return `<strong>⚠️ Per Kilometer Transit Policy (प्रति किमी परिवहन नियम):</strong><br>
      Billed per actual odometer distance traveled. Starting odometer verified at hub departure.`;
  } else if (billingUnitCode === 'PER_SHIFT') {
    return `<strong>⚠️ Dedicated Shift Policy (प्रति शिफ्ट नियम):</strong><br>
      Billed per 8-hour working shift window with certified operator. Overtime pro-rated.`;
  } else if (billingUnitCode === 'PER_TON') {
    return `<strong>⚠️ Payload Tonnage Policy (प्रति टन वजन नियम):</strong><br>
      Billed per actual tonnage loaded/moved with verified weighbridge slips.`;
  } else if (billingUnitCode === 'MONTHLY') {
    return `<strong>⚠️ Monthly Lease Contract Policy (मासिक अनुबंध नियम):</strong><br>
      Dedicated deployment under long-term contract with periodic hub maintenance checkups.`;
  } else {
    return `<strong>⚠️ Shift Hours & Overtime Policy (कार्य समय व शिफ्ट नियम):</strong><br>
      Standard operational duty is 8:00 hours once handed over to farmer at field (+ 1:00 hour buffer allowed without extra charge). Working beyond 9:00 hours is levied at pro-rata hourly rates. ${isZeroDeposit ? 'Zero deposit held under farmer welfare scheme.' : 'Adjusted from escrow deposit upon return.'} Customer acceptance signature confirms agreement to these terms.`;
  }
}

function getDynamicSettlementSummary(booking: Booking): string {
  const isZeroDeposit = Number(booking.depositAmount || 0) === 0;
  const billingUnitCode = resolveBillingUnitCode(booking.asset?.billingUnit);
  const shiftText = billingUnitCode === 'HOURLY'
    ? 'Actual operating metered run hours were audited with no daily shift boundation.'
    : billingUnitCode === 'PER_HOLE'
    ? 'Total drilled hole count was verified with zero time restriction.'
    : billingUnitCode === 'PER_TRIP'
    ? 'Total haulage transport trips were verified.'
    : billingUnitCode === 'PER_ACRE'
    ? 'Total acreage field coverage was verified.'
    : billingUnitCode === 'PER_KM'
    ? 'Total transit odometer distance was verified.'
    : billingUnitCode === 'PER_TON'
    ? 'Total material payload tonnage was audited.'
    : 'Standard 8-hr duty shift (+ 1 hr complimentary grace buffer) was audited.';

  const depositText = isZeroDeposit
    ? 'Zero security deposit was required under the Farmer Welfare Scheme (₹0 जमानत योजना), hence no escrow refund was locked.'
    : 'All refundable security deposit escrow balances have been processed via instant UPI transfer.';

  return `
    <strong>Audit Summary & Closure Statement (अंतिम खाता निपटान):</strong><br>
    The equipment has successfully undergone comprehensive yard inward inspection. ${shiftText} ${depositText} The rental account for <strong>${escapeHtml(booking.bookingNumber)}</strong> is formally closed with zero balance outstanding.
  `;
}

const COMMON_CSS = `
  @page {
    size: A4 portrait;
    margin: 12mm 14mm;
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
    padding: 20px;
    font-size: 12.5px;
    line-height: 1.45;
  }
  .doc-container {
    max-width: 820px;
    margin: 0 auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 28px 32px;
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
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .brand-logo {
    height: 64px;
    width: auto;
    max-width: 260px;
    object-fit: contain;
    object-position: left center;
    display: block;
    margin-bottom: 4px;
  }
  .brand-title {
    font-size: 22px;
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
    letter-spacing: 0.8px;
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
    letter-spacing: 0.3px;
  }
  .badge-emerald { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .badge-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .badge-purple { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
  .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .badge-sky { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
  .voucher-no {
    font-family: monospace;
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 5px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
  }
  .panel-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #475569;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 11.5px;
  }
  .info-label { color: #64748b; font-weight: 500; }
  .info-val { font-weight: 700; color: #0f172a; text-align: right; }
  table.ledger-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 11.5px;
  }
  table.ledger-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  table.ledger-table td {
    padding: 9px 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  table.ledger-table tr:last-child td {
    border-bottom: 2px solid #0f172a;
  }
  .total-row {
    background: #f8fafc;
    font-weight: 800;
    font-size: 12px;
  }
  .footer {
    border-top: 1px dashed #cbd5e1;
    padding-top: 16px;
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .terms {
    font-size: 9.5px;
    color: #64748b;
    max-width: 500px;
    line-height: 1.4;
  }
  .sign-box {
    text-align: center;
    border-top: 1px solid #0f172a;
    padding-top: 5px;
    width: 150px;
    font-size: 9.5px;
    font-weight: 700;
    color: #334155;
  }
  .official-seal {
    display: inline-block;
    border: 2px solid #059669;
    color: #059669;
    font-weight: 900;
    font-size: 9.5px;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .highlight-box {
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 16px;
    font-size: 11px;
    line-height: 1.45;
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
  const win = window.open('', '_blank', 'width=900,height=920,menubar=no,toolbar=no,location=no,status=no');
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
 * Reflects farm-aware destination, bilingual farmer status, assisted channel,
 * zero-deposit scheme waiver, and 0-5km free delivery radius.
 */
export function printBookingConfirmationPdf(data: BookingVoucherData) {
  const { booking } = data;
  const advancePaid = data.advancePaid ?? booking.advancePaid ?? (booking.baseRent || 0);
  const depositPaid = data.depositPaid ?? booking.depositPaid ?? (booking.depositAmount || 0);
  const totalPaid = data.totalPaid ?? (advancePaid + depositPaid);
  const nowStr = data.issuedAt || new Date().toLocaleString('en-IN');
  const stationName = data.stationName || (booking.asset?.hubName ? `${booking.asset.hubName} Hub` : ((booking.customer as any)?.hub?.name ? `${(booking.customer as any).hub.name} Hub` : ((booking.customer as any)?.hubName ? `${(booking.customer as any).hubName} Hub` : '')));

  const statusInfo = getFarmerFriendlyStatus(booking.status);
  const sourceMeta = getBookingSourceMeta(booking.bookingSource);
  const farmLocation = data.farmLocation || booking.farmLocation;

  const isFreeDelivery = Number(booking.distanceKm || 0) <= 5 || Number(booking.deliveryFee || 0) === 0;
  const isZeroDeposit = Number(booking.depositAmount || 0) === 0;

  const billingUnitText = getBillingUnitDisplayName(booking.asset?.billingUnit || 'DAILY');

  const categoryLabel = booking.asset.category === 'MULTIPURPOSE_FLEET'
    ? 'Multipurpose Fleet (बहुउद्देशीय वाहन)'
    : booking.asset.category === 'CONSTRUCTION'
    ? 'Construction Equipment (निर्माण उपकरण)'
    : 'Agricultural Machinery (कृषि उपकरण)';

  const customerSiteTitle = booking.asset.category === 'CONSTRUCTION'
    ? 'Customer & Site Details (ग्राहक व निर्माण स्थल)'
    : booking.asset.category === 'MULTIPURPOSE_FLEET'
    ? 'Customer & Destination Site (ग्राहक व कार्य स्थल विवरण)'
    : 'Customer & Delivery Field (किसान व खेत विवरण)';

  const modelDisplay = booking.asset.modelName ? `${booking.asset.name} (${booking.asset.modelName})` : booking.asset.name;

  const bodyHtml = `
    <div class="header">
      <div>
        <img src="${getLogoUrl()}" alt="EquipGrid" class="brand-logo" onerror="this.onerror=null; this.src='/logo-rectangle.png';" />
        <div class="brand-sub">Agricultural, Construction & Multipurpose Fleet Station (कृषि, निर्माण व बहुउद्देशीय यांत्रिक सेवा)</div>
        ${stationName ? `<div style="font-size: 11px; color: #475569; margin-top: 3px;">${escapeHtml(stationName)} · Dispatch &amp; Handover Desk</div>` : ''}
      </div>
      <div class="voucher-badge">
        <span class="badge-tag badge-emerald">${escapeHtml(statusInfo.farmerLabelHi)} · ${escapeHtml(statusInfo.farmerLabelEn)}</span>
        <div class="voucher-no">${escapeHtml(booking.bookingNumber)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Issued: ${escapeHtml(nowStr)}</div>
        <div style="margin-top: 4px;">
          <span style="font-size: 10px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1;">
            ${escapeHtml(sourceMeta.hi)} (${escapeHtml(sourceMeta.en)})
          </span>
        </div>
      </div>
    </div>

    ${booking.callbackRequested ? `
    <div class="highlight-box" style="background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-weight: 700;">
      📞 <strong>Callback Requested by Farmer (किसान को कॉल बैक सहायता आवश्यक):</strong> Our hub team has flagged this reservation for proactive telephone coordination before dispatch.
    </div>` : ''}

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">
          <span>${escapeHtml(customerSiteTitle)}</span>
          ${isFreeDelivery ? '<span style="color: #047857; font-size: 9px; background: #ecfdf5; padding: 1px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">🟢 0-5km Free Delivery</span>' : ''}
        </div>
        <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${escapeHtml(booking.customer.fullName)}</span></div>
        <div class="info-row"><span class="info-label">WhatsApp Mobile:</span><span class="info-val">+91 ${escapeHtml(booking.customer.phone)}</span></div>
        
        ${farmLocation || booking.deliveryLocationName ? `
        <div class="info-row">
          <span class="info-label">Saved Farm / Field:</span>
          <span class="info-val" style="color: #0369a1;">
            ${escapeHtml(farmLocation?.localName || booking.deliveryLocationName)}
            ${farmLocation?.localNameHindi ? ` (${escapeHtml(farmLocation.localNameHindi)})` : ''}
          </span>
        </div>
        ${farmLocation?.aliases ? `
        <div class="info-row"><span class="info-label">Spoken Aliases:</span><span class="info-val" style="font-size: 11px;">${escapeHtml(farmLocation.aliases)}</span></div>` : ''}
        ${farmLocation?.landmark ? `
        <div class="info-row"><span class="info-label">Landmark:</span><span class="info-val" style="font-size: 11px;">${escapeHtml(farmLocation.landmark)}</span></div>` : ''}
        ${farmLocation?.accessNotes ? `
        <div style="margin-top: 6px; padding: 6px 8px; background: #fefce8; border: 1px solid #fef08a; border-radius: 4px; font-size: 10.5px; color: #854d0e;">
          🚜 <strong>Field Access:</strong> ${escapeHtml(farmLocation.accessNotes)}
        </div>` : ''}
        ${farmLocation?.deliveryContactName ? `
        <div class="info-row" style="margin-top: 4px;"><span class="info-label">Site Receiver:</span><span class="info-val">${escapeHtml(farmLocation.deliveryContactName)} (+91 ${escapeHtml(farmLocation.deliveryContactPhone || booking.customer.phone)})</span></div>` : ''}
        ` : `
        <div class="info-row"><span class="info-label">Delivery Address:</span><span class="info-val" style="max-width: 200px;">${escapeHtml(booking.deliveryAddress)}</span></div>
        `}
        
        <div class="info-row" style="margin-top: 4px;">
          <span class="info-label">Hub Distance:</span>
          <span class="info-val">
            ${booking.distanceKm || 0} km
            ${isFreeDelivery ? ' · <strong style="color: #047857;">(नि:शुल्क / Free)</strong>' : ''}
          </span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span>Machine & Tariff Specification (मशीन विवरण)</span>
          <span style="color: #b45309; font-size: 9px; font-family: monospace;">${escapeHtml(booking.asset.assetTag)}</span>
        </div>
        <div class="info-row"><span class="info-label">Machinery:</span><span class="info-val">${escapeHtml(booking.asset.name)}</span></div>
        <div class="info-row"><span class="info-label">Category / Model:</span><span class="info-val">${escapeHtml(categoryLabel)} · ${escapeHtml(modelDisplay)}</span></div>
        <div class="info-row"><span class="info-label">Rental Duration:</span><span class="info-val">${escapeHtml(booking.startDate)} to ${escapeHtml(booking.endDate)}</span></div>
        <div class="info-row"><span class="info-label">Billing Metric:</span><span class="info-val" style="color: #0369a1;">${escapeHtml(billingUnitText)}</span></div>
        ${booking.asset.shiftTerms ? `
        <div style="margin-top: 6px; padding: 6px 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; font-size: 10.5px; color: #1e40af;">
          ⏱️ <strong>Shift Terms:</strong> ${escapeHtml(booking.asset.shiftTerms)}
        </div>` : ''}
        ${booking.operatorRequired ? `
        <div class="info-row" style="margin-top: 4px;"><span class="info-label">Certified Operator:</span><span class="info-val" style="color: #047857;">Included (ऑपरेटर सहित)</span></div>` : ''}
      </div>
    </div>

    <table class="ledger-table">
      <thead>
        <tr>
          <th>Description (मद)</th>
          <th style="text-align: center;">Metric / Shift</th>
          <th style="text-align: right;">Tariff Rate</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Equipment Base Rental (मशीन किराया)</strong>
            <div style="font-size: 10.5px; color: #64748b;">${escapeHtml(booking.asset.name)} · ${escapeHtml(billingUnitText)}</div>
          </td>
          <td style="text-align: center;">${escapeHtml(booking.startDate)} → ${escapeHtml(booking.endDate)}</td>
          <td style="text-align: right;">${formatINR(booking.asset.dailyRate)}</td>
          <td style="text-align: right;">${formatINR(booking.baseRent)}</td>
        </tr>
        <tr>
          <td>
            <strong>Security Deposit (अमानत राशि)</strong>
            <div style="font-size: 10.5px; color: ${isZeroDeposit ? '#047857' : '#64748b'};">
              ${isZeroDeposit 
                ? '✨ Zero-Deposit Scheme (किसान सहायता योजना — ₹0 जमानत राशि)' 
                : '100% Refundable Escrow (वापसी पर 15 मिनट में तुरंत रिफंड)'}
            </div>
          </td>
          <td style="text-align: center;">${isZeroDeposit ? 'Waiver' : 'Escrow Deposit'}</td>
          <td style="text-align: right;">—</td>
          <td style="text-align: right; color: ${isZeroDeposit ? '#047857' : '#0f172a'}; font-weight: 700;">
            ${formatINR(booking.depositAmount)}
          </td>
        </tr>
        <tr>
          <td>
            <strong>Logistics & Flatbed Delivery (खेत तक परिवहन)</strong>
            <div style="font-size: 10.5px; color: ${isFreeDelivery ? '#047857' : '#64748b'};">
              ${isFreeDelivery 
                ? '🟢 FREE 0–5 km Base Radius Delivery (नि:शुल्क डिलीवरी)' 
                : `Flatbed transit to site (${booking.distanceKm || 0} km)`}
            </div>
          </td>
          <td style="text-align: center;">${booking.distanceKm || 0} km</td>
          <td style="text-align: right;">—</td>
          <td style="text-align: right; color: ${isFreeDelivery ? '#047857' : '#0f172a'}; font-weight: 700;">
            ${formatINR(booking.deliveryFee)}
          </td>
        </tr>
        ${booking.operatorFee ? `
        <tr>
          <td>
            <strong>Certified Machinery Operator Allowance (कुशल ऑपरेटर)</strong>
            <div style="font-size: 10.5px; color: #64748b;">Full duty field operation allowance</div>
          </td>
          <td style="text-align: center;">Full Duty</td>
          <td style="text-align: right;">—</td>
          <td style="text-align: right;">${formatINR(booking.operatorFee)}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td colspan="3"><strong>Total Commercial Obligation (कुल देय राशि)</strong></td>
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

    <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 9px 14px; margin-bottom: 16px;">
      <div>
        <span class="official-seal">PAID & DISPATCH READY</span>
        <div style="font-size: 11px; color: #065f46; margin-top: 3px; font-weight: 600;">
          Zero-Open-Credit Verified. Machine authorized for yard handover and field delivery.
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; color: #64748b;">Balance Due Before Dispatch:</div>
        <div style="font-size: 16px; font-weight: 900; color: #047857; font-family: monospace;">₹0.00</div>
      </div>
    </div>

    <div class="footer">
      <div class="terms">
        ${getDynamicBookingTerms(booking)}
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
 * Reflects farm-specific delivery notes, driver & vehicle details,
 * road access instructions for transporter, and gate-pass clearance.
 */
export function printDispatchChallanPdf(data: DispatchVoucherData) {
  const { booking, challan } = data;
  const nowStr = data.issuedAt || new Date().toLocaleString('en-IN');
  const stationName = data.stationName || (booking.asset?.hubName ? `${booking.asset.hubName} Hub` : ((booking.customer as any)?.hub?.name ? `${(booking.customer as any).hub.name} Hub` : ((booking.customer as any)?.hubName ? `${(booking.customer as any).hubName} Hub` : '')));

  const farmLocation = booking.farmLocation;
  const driverPhone = data.driverPhone || challan.driverPhone || '';
  const vehicleNumber = data.vehicleNumber || challan.vehicleNumber || '';

  const dispatchDestTitle = booking.asset?.category === 'CONSTRUCTION'
    ? 'Customer & Construction Site (ग्राहक व निर्माण स्थल)'
    : booking.asset?.category === 'MULTIPURPOSE_FLEET'
    ? 'Customer & Destination Site (ग्राहक व कार्य स्थल)'
    : 'Customer & Destination Farm (किसान व गंतव्य खेत)';

  const destLabel = booking.asset?.category === 'CONSTRUCTION'
    ? 'Site Destination:'
    : booking.asset?.category === 'MULTIPURPOSE_FLEET'
    ? 'Worksite Destination:'
    : 'Field Destination:';

  const bodyHtml = `
    <div class="header">
      <div>
        <img src="${getLogoUrl()}" alt="EquipGrid" class="brand-logo" onerror="this.onerror=null; this.src='/logo-rectangle.png';" />
        <div class="brand-sub">Gate Pass & Outward Delivery Challan (मशीन डिलीवरी चालान व गेट पास)</div>
        ${stationName ? `<div style="font-size: 11px; color: #475569; margin-top: 3px;">${escapeHtml(stationName)} · Dispatch Desk</div>` : ''}
      </div>
      <div class="voucher-badge">
        <span class="badge-tag badge-blue">मशीन रवाना · Dispatched</span>
        <div class="voucher-no">${escapeHtml(challan.challanNumber)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Gate Pass: ${escapeHtml(nowStr)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">${escapeHtml(dispatchDestTitle)}</div>
        <div class="info-row"><span class="info-label">Customer:</span><span class="info-val">${escapeHtml(booking.customer.fullName)}</span></div>
        <div class="info-row"><span class="info-label">WhatsApp:</span><span class="info-val">+91 ${escapeHtml(booking.customer.phone)}</span></div>
        <div class="info-row">
          <span class="info-label">${escapeHtml(destLabel)}</span>
          <span class="info-val" style="color: #0369a1;">
            ${escapeHtml(farmLocation?.localName || booking.deliveryLocationName || booking.deliveryAddress)}
            ${farmLocation?.localNameHindi ? ` (${escapeHtml(farmLocation.localNameHindi)})` : ''}
          </span>
        </div>
        ${farmLocation?.landmark ? `
        <div class="info-row"><span class="info-label">Landmark:</span><span class="info-val" style="font-size: 11px;">${escapeHtml(farmLocation.landmark)}</span></div>` : ''}
        ${farmLocation?.village ? `
        <div class="info-row"><span class="info-label">Village / Tehsil:</span><span class="info-val">${escapeHtml(farmLocation.village)}${farmLocation.tehsil ? `, ${escapeHtml(farmLocation.tehsil)}` : ''}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Site Receiver:</span><span class="info-val">${escapeHtml(farmLocation?.deliveryContactName || booking.customer.fullName)} (+91 ${escapeHtml(farmLocation?.deliveryContactPhone || booking.customer.phone)})</span></div>
        <div class="info-row"><span class="info-label">Booking Ref:</span><span class="info-val" style="font-family: monospace;">${escapeHtml(booking.bookingNumber)}</span></div>
      </div>

      <div class="panel">
        <div class="panel-title">Dispatch Vehicle & Driver (चालक व वाहन विवरण)</div>
        <div class="info-row"><span class="info-label">Driver / Pilot:</span><span class="info-val">${escapeHtml(challan.driverName || '—')}</span></div>
        <div class="info-row"><span class="info-label">Driver Phone:</span><span class="info-val">${driverPhone ? `+91 ${escapeHtml(driverPhone)}` : '—'}</span></div>
        <div class="info-row"><span class="info-label">Vehicle No:</span><span class="info-val" style="font-family: monospace; font-weight: 800;">${vehicleNumber ? escapeHtml(vehicleNumber) : '—'}</span></div>
        <div class="info-row"><span class="info-label">Machine Tag:</span><span class="info-val" style="font-family: monospace; color: #b45309;">${escapeHtml(challan.assetTag || booking.asset.assetTag)}</span></div>
        <div class="info-row"><span class="info-label">Fuel Out:</span><span class="info-val" style="color: #047857;">${escapeHtml(challan.fuelLevel || '—')}</span></div>
        <div class="info-row"><span class="info-label">Meter Reading Out:</span><span class="info-val">${challan.engineHoursOut !== undefined && challan.engineHoursOut !== null ? `${challan.engineHoursOut} hrs` : '—'}</span></div>
      </div>
    </div>

    ${farmLocation?.accessNotes ? `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 11px; color: #78350f;">
      <strong>🚜 Route & Road Access Instructions for Transporter (चालक के लिए रास्ता निर्देश):</strong><br/>
      ${escapeHtml(farmLocation.accessNotes)}
    </div>` : ''}

    <div class="panel" style="margin-bottom: 16px;">
      <div class="panel-title">28-Point Pre-Dispatch Mechanical & Safety Yard Audit (सुरक्षा जांच)</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10.5px; margin-top: 4px;">
        <div>✅ Engine Oil & Hydraulic Fluid Levels Verified</div>
        <div>✅ All Grease Points & Moving Joints Inspected</div>
        <div>✅ High-Pressure Hose & Electrical Cables Tested</div>
        <div>✅ Emergency Stop & Safety Guards Operational</div>
        <div>✅ Standard Tool Kit & Safety Accessories Complete</div>
        <div>✅ Site Delivery Protocol & Safe Unloading Briefed</div>
      </div>
      ${challan.conditionNotes ? `
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 10.5px; color: #475569;">
        <strong>Yard Handover Notes:</strong> ${escapeHtml(challan.conditionNotes)}
      </div>` : ''}
    </div>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 10.5px; line-height: 1.45; color: #92400e;">
      ${getDynamicDispatchPolicy(booking)}
    </div>

    <div class="footer">
      <div class="sign-box">
        Yard Technician Signature<br>
        <span style="font-size: 9px; color: #64748b;">EquipGrid Logistics</span>
      </div>
      <div class="sign-box">
        Transporter / Driver Signature<br>
        <span style="font-size: 9px; color: #64748b;">${escapeHtml(challan.driverName || '—')}</span>
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
 * Reflects settled refund transaction reference (UTR), return condition,
 * transparent escrow deductions ledger, and instant closure.
 */
export function printReturnSettlementPdf(data: SettlementVoucherData) {
  const { booking, inspection } = data;
  const nowStr = data.issuedAt || new Date().toLocaleString('en-IN');
  const stationName = data.stationName || (booking.asset?.hubName ? `${booking.asset.hubName} Hub` : ((booking.customer as any)?.hub?.name ? `${(booking.customer as any).hub.name} Hub` : ((booking.customer as any)?.hubName ? `${(booking.customer as any).hubName} Hub` : '')));

  const farmLocation = booking.farmLocation;
  const refundUtr = data.refundTransactionRef || 'Pending Settlement Transfer';
  const refundStatus = data.refundStatus || (data.refundTransactionRef ? 'COMPLETED' : 'PENDING');

  const custTitle = booking.asset?.category === 'CONSTRUCTION'
    ? 'Customer & Project Details (ग्राहक व परियोजना विवरण)'
    : booking.asset?.category === 'MULTIPURPOSE_FLEET'
    ? 'Customer & Operation Details (ग्राहक व परिचालन विवरण)'
    : 'Customer & Booking Details (किसान विवरण)';

  const siteLabel = booking.asset?.category === 'CONSTRUCTION'
    ? 'Site Location:'
    : booking.asset?.category === 'MULTIPURPOSE_FLEET'
    ? 'Worksite Location:'
    : 'Farm Location:';

  const bodyHtml = `
    <div class="header">
      <div>
        <img src="${getLogoUrl()}" alt="EquipGrid" class="brand-logo" onerror="this.onerror=null; this.src='/logo-rectangle.png';" />
        <div class="brand-sub">Return Inspection Audit & Deposit Settlement Statement (Form F-004 / अमानत राशि निपटान)</div>
        <div style="font-size: 11px; color: #475569; margin-top: 3px;">${stationName ? `${escapeHtml(stationName)} · ` : ''}Accounts Clearance Desk</div>
      </div>
      <div class="voucher-badge">
        <span class="badge-tag badge-purple">${data.refundStatus === 'PENDING' ? 'प्रक्रियाधीन · Pending' : 'खाता चुकता · Settled'}</span>
        <div class="voucher-no">F-004-SET-${escapeHtml(booking.bookingNumber)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Settled: ${escapeHtml(nowStr)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">${escapeHtml(custTitle)}</div>
        <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${escapeHtml(booking.customer.fullName)}</span></div>
        <div class="info-row"><span class="info-label">UPI / Mobile Ref:</span><span class="info-val">+91 ${escapeHtml(data.refundDestination || booking.customer.phone)}</span></div>
        <div class="info-row"><span class="info-label">Booking Reference:</span><span class="info-val" style="font-family: monospace;">${escapeHtml(booking.bookingNumber)}</span></div>
        ${farmLocation || booking.deliveryLocationName ? `
        <div class="info-row"><span class="info-label">${siteLabel}</span><span class="info-val">${escapeHtml(farmLocation?.localName || booking.deliveryLocationName)}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Rental Duration:</span><span class="info-val">${escapeHtml(booking.startDate)} → ${escapeHtml(booking.endDate)}</span></div>
      </div>

      <div class="panel">
        <div class="panel-title">Inward Yard Audit Information (वापसी जांच विवरण)</div>
        <div class="info-row"><span class="info-label">Machine:</span><span class="info-val">${escapeHtml(booking.asset.name)}</span></div>
        <div class="info-row"><span class="info-label">Asset Tag:</span><span class="info-val" style="font-family: monospace; color: #b45309;">${escapeHtml(booking.asset.assetTag)}</span></div>
        <div class="info-row"><span class="info-label">Inspected By:</span><span class="info-val">${escapeHtml(data.inspectorName || '—')}</span></div>
        <div class="info-row"><span class="info-label">Yard Status Post-Return:</span><span class="info-val" style="color: ${data.damageCost > 0 ? '#b91c1c' : '#047857'}; font-weight: 800;">${data.damageCost > 0 ? 'MAINTENANCE REQUIRED' : 'AVAILABLE (READY FOR NEXT DEPLOYMENT)'}</span></div>
      </div>
    </div>

    <table class="ledger-table">
      <thead>
        <tr>
          <th>Settlement Component (निपटान घटक)</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Original Security Deposit Held in Escrow (जमानत राशि)</strong>
            <div style="font-size: 10.5px; color: #64748b;">Collected at booking confirmation · सुरक्षित एस्क्रो खाता</div>
          </td>
          <td style="text-align: right; font-weight: 700; color: #047857;">+${formatINR(data.originalDeposit)}</td>
        </tr>
        <tr>
          <td>
            <strong>Fuel Surcharge / Delta Adjustment (ईंधन अंतर समायोजन)</strong>
            <div style="font-size: 10.5px; color: #64748b;">Tank refueling delta at return check-in</div>
          </td>
          <td style="text-align: right; color: ${data.fuelDeltaCharge > 0 ? '#b91c1c' : '#64748b'};">
            ${data.fuelDeltaCharge > 0 ? `-${formatINR(data.fuelDeltaCharge)}` : '₹0.00 (Matched / No Charge)'}
          </td>
        </tr>
        <tr>
          <td>
            <strong>Mechanical Damage / Refurbishment Deductions (मरम्मत कटौती)</strong>
            <div style="font-size: 10.5px; color: #64748b;">${escapeHtml(data.damageNotes || 'No damages reported.')}</div>
          </td>
          <td style="text-align: right; color: ${data.damageCost > 0 ? '#b91c1c' : '#64748b'};">
            ${data.damageCost > 0 ? `-${formatINR(data.damageCost)}` : '₹0.00 (Zero Damage)'}
          </td>
        </tr>
        <tr class="total-row" style="background: #ecfdf5;">
          <td>
            <strong style="color: #047857; font-size: 13px;">Net Security Deposit Refund to Farmer (किसान को शुद्ध वापसी)</strong>
            <div style="font-size: 10.5px; color: #065f46;">
              Processed via Instant UPI · Ref: <strong style="font-family: monospace;">${escapeHtml(refundUtr)}</strong> (${escapeHtml(refundStatus)})
            </div>
          </td>
          <td style="text-align: right; color: #047857; font-size: 17px; font-weight: 900; font-family: monospace;">
            ${formatINR(data.netRefund)}
          </td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 10.5px; line-height: 1.45;">
      ${getDynamicSettlementSummary(booking)}
    </div>

    <div class="footer">
      <div class="sign-box">
        Hub Technical Inspector<br>
        <span style="font-size: 9px; color: #64748b;">${escapeHtml(data.inspectorName || '—')}</span>
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
