import React from 'react';
import {
  Cpu,
  Layers,
  Database,
  Server,
  Monitor,
  ShieldCheck,
  CheckCircle,
  GitBranch,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Cpu className="h-6 w-6 text-amber-400" />
          EquipGrid Platform Architecture & System Blueprint
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete architectural mapping between equipgrid-station, equipgrid-power and PostgreSQL
        </p>
      </div>

      {/* Layer Diagram Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-400" />
          Multi-Tier Architectural Blueprint
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {/* Frontend */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-blue-400">Frontend Layer</span>
              <h4 className="text-base font-bold text-white">equipgrid-station</h4>
              <p className="text-xs text-slate-400 mt-1">React 19, TypeScript, Vite, Tailwind CSS</p>
            </div>
            <ul className="text-[11px] text-slate-300 text-left space-y-1 pt-2 border-t border-blue-500/20">
              <li>• Booking Desk & Instant Quoter (SOP-002)</li>
              <li>• Yard Handover & Challan (SOP-005)</li>
              <li>• Return Physical Inspection (SOP-008)</li>
              <li>• Daily Cash Reconciliation (SOP-015)</li>
            </ul>
          </div>

          {/* Backend */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-amber-400">Backend Core</span>
              <h4 className="text-base font-bold text-white">equipgrid-power</h4>
              <p className="text-xs text-slate-400 mt-1">Java 21 LTS, Spring Boot 3.3.5, Security 6, JWT</p>
            </div>
            <ul className="text-[11px] text-slate-300 text-left space-y-1 pt-2 border-t border-amber-500/20">
              <li>• Section 10.4 Zero-Credit Barrier</li>
              <li>• Asset Lifecycle State Machine</li>
              <li>• 6% Partner Referral Commission Engine</li>
              <li>• Append-Only Audit Trail Ledger</li>
            </ul>
          </div>

          {/* Database */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-emerald-400">Database Layer</span>
              <h4 className="text-base font-bold text-white">equipgrid_dev / prod</h4>
              <p className="text-xs text-slate-400 mt-1">PostgreSQL 16, Flyway Migrations, HikariCP</p>
            </div>
            <ul className="text-[11px] text-slate-300 text-left space-y-1 pt-2 border-t border-emerald-500/20">
              <li>• V1: Relational Schema & Constraints</li>
              <li>• V2: Baseline DPR Fleet Seed Data</li>
              <li>• Audit Logs & State Transitions</li>
              <li>• Docker Compose containerized</li>
            </ul>
          </div>
        </div>

        {/* State Machine */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-400" />
            Asset Lifecycle State Machine (Section 1.3 & 20)
          </h4>

          <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl border border-slate-800 bg-slate-950/60 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AVAILABLE
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              RESERVED (Quote)
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              DISPATCHED (Challan)
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded bg-amber-600/20 text-amber-400 border border-amber-500/40">
              ON_RENT
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              RETURNED (Inspection)
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              MAINTENANCE (if damaged)
            </span>
            <span className="text-slate-600">or</span>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AVAILABLE
            </span>
          </div>
        </div>

        {/* Zero-Open-Credit Flow */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldCheck className="h-4 w-4" />
            <span>Section 10.4: Zero-Open-Credit Rule Implementation</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            In <code className="text-amber-400">DispatchService.java</code>:
          </p>
          <pre className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto">
{`if (advancePaid + depositPaid < depositAmount + baseRent) {
    throw new BusinessRuleViolationException("ZERO-OPEN-CREDIT VIOLATION: Dispatch blocked!");
}`}
          </pre>
          <p className="text-slate-400 text-[11px]">
            No physical equipment may leave the yard without verified upfront payment & deposit receipt in the system.
          </p>
        </div>
      </div>
    </div>
  );
};
