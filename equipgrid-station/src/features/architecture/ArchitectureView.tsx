import React from 'react';
import { Cpu, Layers, Database, Server, Monitor, ShieldCheck, GitBranch } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Cpu className="h-6 w-6 text-teal-700" />
          EquipGrid Platform Architecture & System Blueprint
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Complete architectural mapping between equipgrid-station, equipgrid-power and PostgreSQL
        </p>
      </div>

      {/* Layer Diagram Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="h-4 w-4 text-teal-700" />
          Multi-Tier Architectural Blueprint
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {/* Frontend */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-blue-700">Frontend Layer</span>
              <h4 className="text-base font-bold text-slate-900">equipgrid-station</h4>
              <p className="text-xs text-slate-500 mt-1">React 19, TypeScript, Vite, Tailwind CSS</p>
            </div>
            <ul className="text-[11px] text-slate-600 text-left space-y-1 pt-2 border-t border-blue-200">
              <li>• Booking Desk & Instant Quoter (SOP-002)</li>
              <li>• Yard Handover & Challan (SOP-005)</li>
              <li>• Return Physical Inspection (SOP-008)</li>
              <li>• Daily Cash Reconciliation (SOP-015)</li>
            </ul>
          </div>

          {/* Backend */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-teal-700">Backend Core</span>
              <h4 className="text-base font-bold text-slate-900">equipgrid-power</h4>
              <p className="text-xs text-slate-500 mt-1">Java 21 LTS, Spring Boot 3.3.5, Security 6, JWT</p>
            </div>
            <ul className="text-[11px] text-slate-600 text-left space-y-1 pt-2 border-t border-teal-200">
              <li>• Section 10.4 Zero-Credit Barrier</li>
              <li>• Asset Lifecycle State Machine</li>
              <li>• 6% Partner Referral Commission Engine</li>
              <li>• Append-Only Audit Trail Ledger</li>
            </ul>
          </div>

          {/* Database */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-emerald-700">Database Layer</span>
              <h4 className="text-base font-bold text-slate-900">equipgrid_dev / prod</h4>
              <p className="text-xs text-slate-500 mt-1">PostgreSQL 16, Flyway Migrations, HikariCP</p>
            </div>
            <ul className="text-[11px] text-slate-600 text-left space-y-1 pt-2 border-t border-emerald-200">
              <li>• V1: Relational Schema & Constraints</li>
              <li>• V2: Baseline DPR Fleet Seed Data</li>
              <li>• Audit Logs & State Transitions</li>
              <li>• Docker Compose containerized</li>
            </ul>
          </div>
        </div>

        {/* State Machine */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-teal-700" />
            Asset Lifecycle State Machine (Section 1.3 & 20)
          </h4>

          <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
              AVAILABLE
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 border border-blue-300 font-bold">
              RESERVED (Quote)
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-teal-100 text-teal-900 border border-teal-300 font-bold">
              DISPATCHED (Challan)
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-300 font-bold">
              ON_RENT
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-purple-100 text-purple-800 border border-purple-300 font-bold">
              RETURNED (Inspection)
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold">
              MAINTENANCE (if damaged)
            </span>
            <span className="text-slate-400">or</span>
            <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
              AVAILABLE
            </span>
          </div>
        </div>

        {/* Zero-Open-Credit Flow */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-teal-900">
            <ShieldCheck className="h-4 w-4 text-teal-700" />
            <span>Section 10.4: Zero-Open-Credit Rule Implementation</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            In <code className="text-teal-800 font-mono font-bold">DispatchService.java</code>:
          </p>
          <pre className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto">
            {`if (advancePaid + depositPaid < depositAmount + baseRent) {
    throw new BusinessRuleViolationException("ZERO-OPEN-CREDIT VIOLATION: Dispatch blocked!");
}`}
          </pre>
          <p className="text-slate-500 text-[11px]">
            No physical equipment may leave the yard without verified upfront payment & deposit receipt in the system.
          </p>
        </div>
      </div>
    </div>
  );
};
