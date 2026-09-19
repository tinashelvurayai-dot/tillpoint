import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Download,
  Save,
  Sparkles,
  ShieldCheck,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Info,
  PenLine,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { HandoverReceipt } from "@/components/handover-receipt";

export const Route = createFileRoute("/_authenticated/manager/agreement")({
  head: () => ({
    meta: [
      { title: "Handover & Acceptance Agreement - Retail OS" },
      {
        name: "description",
        content:
          "The final POS software development, handover and acceptance agreement for TillPoint Retail OS.",
      },
      { property: "og:title", content: "Handover & Acceptance Agreement - Retail OS" },
      {
        property: "og:description",
        content:
          "The final POS software development, handover and acceptance agreement for Retail OS.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgreementPage,
});

const KEY = "tillpoint.handover.agreement.v3";

const RECORD: Array<[string, string]> = [
  ["Agreement Date", "27 September 2026"],
  ["Project Name", "Retail OS"],
  ["Software Type", "Cloud-Based Point of Sale (POS) & Retail Management System"],
  ["Application URL", "https://advanced-pos-tillpoint.vercel.app"],
  ["Developers", "codedevelopers151@gmail.com"],
  ["Client", "Mr..."],
  ["Client Contact", "+263..."],
  ["Document Version", "Version 3.0"],
  ["Status", "Final Handover & Acceptance"],
];

type Block = { title: string; intro?: string; groups?: Array<{ label?: string; items: string[] }> };

const SECTIONS: Block[] = [
  {
    title: "1. PREAMBLE",
    intro:
      'This POS Software Development, Handover & Acceptance Agreement ("Agreement") is entered into on 17 August 2026 between the Developers and Mr Pride Tatire ("the Client"). The purpose of this Agreement is to formally record the successful completion, demonstration, delivery, handover and acceptance of the custom-developed TillPoint Retail OS Point-of-Sale System. This document serves as the official record confirming that the software has been developed according to the agreed project scope and has been presented to the Client for operational use.',
  },
  {
    title: "2. PROJECT OVERVIEW",
    intro:
      "The Developers successfully designed and implemented a modern retail Point-of-Sale platform capable of managing day-to-day business operations through an integrated cloud-based system. The software combines sales processing, inventory control, cashier management, reporting, offline capabilities and business analytics into one centralized application suitable for retail environments.",
  },
  {
    title: "3. PROJECT OBJECTIVES",
    intro: "The primary objectives of the project were to:",
    groups: [
      {
        items: [
          "Develop a modern retail management platform.",
          "Improve inventory visibility.",
          "Streamline cashier operations.",
          "Automate sales recording.",
          "Enable offline checkout functionality.",
          "Reduce manual stock management.",
          "Improve financial reporting.",
          "Provide secure role-based access.",
          "Support business scalability.",
          "Deliver a production-ready application.",
        ],
      },
    ],
  },
  {
    title: "4. SCOPE OF WORK COMPLETED",
    intro: "The Developers completed the following project activities:",
    groups: [
      {
        label: "System Analysis",
        items: [
          "Business workflow analysis",
          "Retail process planning",
          "Database planning",
          "User role definition",
        ],
      },
      {
        label: "System Design",
        items: [
          "User Interface (UI) Design",
          "User Experience (UX) Design",
          "Navigation Structure",
          "Mobile Responsiveness",
        ],
      },
      {
        label: "Development",
        items: [
          "Frontend Development",
          "Backend Integration",
          "Database Configuration",
          "Authentication",
          "Authorization",
          "Data Validation",
        ],
      },
      {
        label: "Implementation",
        items: [
          "Inventory Module",
          "Sales Module",
          "Cashier Module",
          "Reporting Module",
          "Offline Module",
          "Synchronization Engine",
        ],
      },
      {
        label: "Deployment",
        items: [
          "Production Deployment",
          "Cloud Hosting Configuration",
          "Environment Configuration",
          "Application Publishing",
        ],
      },
      {
        label: "Quality Assurance",
        items: [
          "Functional Testing",
          "Performance Testing",
          "User Acceptance Demonstration",
          "Bug Fixes",
          "Production Verification",
        ],
      },
    ],
  },
  {
    title: "5. SYSTEM FEATURES DELIVERED",
    intro:
      "The delivered system includes, but is not limited to, the following capabilities:",
    groups: [
      {
        label: "Management Dashboard",
        items: [
          "Business overview",
          "Sales summaries",
          "Performance metrics",
          "Revenue tracking",
          "Operational statistics",
        ],
      },
      {
        label: "Cashier Dashboard",
        items: [
          "Sales interface",
          "Barcode-ready workflow",
          "Cart management",
          "Receipt generation",
          "Customer checkout",
        ],
      },
      {
        label: "Product Management",
        items: [
          "Product creation",
          "Product editing",
          "Product deletion",
          "Categories",
          "Brands",
          "Product variants",
          "Pricing management",
        ],
      },
      {
        label: "Inventory Management",
        items: [
          "Stock levels",
          "Stock adjustments",
          "Stock-In Records",
          "Low stock alerts",
          "Inventory valuation",
        ],
      },
      {
        label: "Sales Management",
        items: [
          "Sales history",
          "Transaction lookup",
          "Daily sales",
          "Monthly sales",
          "Sales exports",
          "Sales analytics",
        ],
      },
      { label: "Order Management", items: ["Customer orders", "Order status", "Order tracking"] },
      {
        label: "Expense Management",
        items: ["Expense recording", "Expense categorization", "Expense reporting"],
      },
      { label: "Supplier Management", items: ["Supplier information", "Supplier records"] },
      {
        label: "Reporting",
        items: [
          "Sales reports",
          "Inventory reports",
          "Profit reports",
          "Operational summaries",
        ],
      },
      {
        label: "Offline Operations",
        items: [
          "Offline checkout",
          "Local transaction storage",
          "Automatic synchronization",
          "Queue management",
        ],
      },
      {
        label: "Administrative Features",
        items: [
          "Role management",
          "User permissions",
          "System settings",
          "Operational manuals",
        ],
      },
    ],
  },
  {
    title: "6. HANDOVER MATERIALS",
    intro: "The Developers have provided the Client with the following:",
    groups: [
      {
        items: [
          "Fully deployed production application.",
          "Operational system walkthrough.",
          "Manager dashboard demonstration.",
          "Cashier dashboard demonstration.",
          "Product management workflow.",
          "Inventory workflow.",
          "Stock-In workflow.",
          "Offline checkout workflow.",
          "Synchronization process.",
          "Sales reporting procedures.",
          "Export functionality.",
          "Administrative configuration.",
          "Operational guidance.",
        ],
      },
    ],
  },
  {
    title: "7. CLIENT ACCEPTANCE TESTING",
    intro: "The Client has reviewed and verified the principal system workflows, including:",
    groups: [
      {
        items: [
          "Manager operations",
          "Cashier sales process",
          "Product creation",
          "Product updates",
          "Product variants",
          "Inventory visibility",
          "Stock-In Records",
          "Sales recording",
          "Offline checkout",
          "Offline synchronization",
          "Reporting",
          "Data exports",
          "User management",
          "Administrative settings",
        ],
      },
      {
        label: "Confirmation",
        items: [
          "Following the demonstration and review, the Client confirms that the software performs substantially in accordance with the agreed project objectives.",
        ],
      },
    ],
  },
  {
    title: "8. FEES AND PAYMENT",
    intro:
      "Total Software Development Fee: USD $170.00. Payment receipts and related financial records shall be retained by both parties for accounting and reference purposes.",
  },
  {
    title: "9. WARRANTY AND POST-HANDOVER SUPPORT",
    intro:
      "The Developers shall provide reasonable clarification relating to the operation of the delivered system during the handover period. The following are not included within the original project scope unless agreed separately in writing:",
    groups: [
      {
        items: [
          "New feature requests",
          "Major design changes",
          "Third-party integrations",
          "Business process redesign",
          "Additional modules",
          "Future enhancements",
          "Large-scale modifications",
        ],
      },
      {
        label: "Note",
        items: [
          "Such work shall be treated as separate development projects and may be subject to additional quotations.",
        ],
      },
    ],
  },
  {
    title: "10. CLIENT RESPONSIBILITIES",
    intro: "The Client agrees to:",
    groups: [
      {
        items: [
          "Maintain accurate product information.",
          "Maintain inventory records.",
          "Control authorized user access.",
          "Protect login credentials.",
          "Maintain operational backups where applicable.",
          "Make business decisions relating to system usage.",
          "Retain payment documentation.",
        ],
      },
    ],
  },
  {
    title: "11. DEVELOPER RESPONSIBILITIES",
    intro: "The Developers confirm that they have:",
    groups: [
      {
        items: [
          "Delivered the agreed software.",
          "Configured the production deployment.",
          "Demonstrated the major workflows.",
          "Performed reasonable testing.",
          "Completed operational handover.",
          "Provided implementation guidance.",
        ],
      },
    ],
  },
  {
    title: "12. CONFIDENTIALITY",
    intro:
      "Both parties agree to exercise reasonable care in protecting confidential information exchanged during the development, deployment and operation of the system. Confidential information includes, but is not limited to:",
    groups: [
      {
        items: [
          "Business information",
          "Commercial information",
          "Technical documentation",
          "Source configurations",
          "User credentials",
          "Internal operational procedures",
        ],
      },
      {
        label: "Note",
        items: [
          "Neither party shall disclose confidential information without prior written consent except where required by law.",
        ],
      },
    ],
  },
  {
    title: "13. LIMITATION OF LIABILITY",
    intro:
      "Following acceptance of the system, the Developers shall not be responsible for losses arising from:",
    groups: [
      {
        items: [
          "Incorrect data entry",
          "Unauthorized user access",
          "Hardware failures",
          "Internet outages",
          "Third-party service interruptions",
          "Improper system usage",
          "Failure to maintain operational backups",
        ],
      },
    ],
  },
  {
    title: "14. FINAL ACCEPTANCE",
    intro: "By signing this Agreement, the Client acknowledges that:",
    groups: [
      {
        items: [
          "The software has been demonstrated.",
          "The principal functionality has been reviewed.",
          "The agreed scope has been delivered.",
          "Operational handover has been completed.",
          "The Client accepts the delivered system subject to any written exceptions recorded below.",
        ],
      },
      { label: "Note", items: ["This Agreement constitutes the official project completion record."] },
    ],
  },
];

const initial = {
  developerOne: "",
  developerTwo: "",
  clientSigner: "Mr Pride Tatire",
  exceptions: "",
};

function readAgreement(): typeof initial {
  if (typeof window === "undefined") return initial;
  try {
    return { ...initial, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return initial;
  }
}

function buildDocument(form: typeof initial): string {
  const lines: string[] = [
    "POS SOFTWARE DEVELOPMENT, HANDOVER & ACCEPTANCE AGREEMENT",
    "",
    "EXECUTIVE RECORD",
    ...RECORD.map(([k, v]) => `${k}: ${v}`),
    "",
  ];
  for (const s of SECTIONS) {
    lines.push(s.title);
    if (s.intro) lines.push(s.intro);
    for (const g of s.groups ?? []) {
      if (g.label) lines.push(g.label);
      for (const item of g.items) lines.push(`- ${item}`);
    }
    lines.push("");
  }
  lines.push(
    "15. OUTSTANDING ITEMS / EXCEPTIONS",
    form.exceptions || "____________________________________________________________",
    "",
    "16. SIGNATURES",
    "The undersigned certify that they are authorized representatives of their respective parties and agree to the terms contained in this Agreement.",
    `Developer 1 Name: ${form.developerOne || "__________________________________________"}`,
    "Developer 1 Signature: __________________________________________",
    "Date: 27 September 2026",
    `Developer 2 Name: ${form.developerTwo || "__________________________________________"}`,
    "Developer 2 Signature: __________________________________________",
    "Date: 27 September 2026",
    `Client Name: ${form.clientSigner || "Mr..."}`,
    "Client Signature: __________________________________________",
    "Date: 27 September 2026",
    "",
    "CERTIFICATE OF COMPLETION",
    "The Developers hereby certify that the TillPoint Retail OS has been successfully designed, developed, deployed and formally handed over to the Client in accordance with the agreed project scope. The Client acknowledges receipt of the delivered software, associated operational workflows and system demonstration, subject only to any written exceptions recorded within this Agreement.",
    "",
    "Document Title: POS Software Development, Handover & Acceptance Agreement",
    "Project: Retail OS",
    "Version: 3.0",
    "Status: Final",
    "Date: 27 September 2026",
  );
  return lines.join("\n");
}

function AgreementPage() {
  const [form, setForm] = useState(readAgreement);
  const update = (key: keyof typeof initial, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(form));
    toast.success("Agreement details saved on this device.");
  };

  const download = () => {
    const blob = new Blob([buildDocument(form)], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TillPoint-Handover-Acceptance-Agreement-v3.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/15 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-orange-500/15 to-amber-500/15 blur-3xl" />
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative mx-auto mb-10 max-w-5xl text-white">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 opacity-40 blur-md" />
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/40">
              <Award className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 px-3 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-300">
              Executive record · Version 3.0 · Final
            </span>
          </div>
        </div>

        <h1 className="max-w-4xl font-serif text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="bg-gradient-to-r from-white via-indigo-100 to-orange-100 bg-clip-text text-transparent">
            POS Software Development, Handover &amp; Acceptance Agreement
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
          Retail OS — final handover and acceptance record dated 17 August 2026.
        </p>

        {/* Status pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-sm">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-200 backdrop-blur-sm">
            <ShieldCheck className="h-3 w-3" />
            Signed off
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1 text-[11px] font-bold text-orange-200 backdrop-blur-sm">
            <Calendar className="h-3 w-3" />
            27 Sept 2026
          </span>
        </div>
      </header>

      {/* Agreement document card */}
      <Card className="relative mx-auto max-w-5xl overflow-hidden border-white/10 bg-white shadow-2xl">
        {/* Top tri-color accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

        <div className="p-6 md:p-12">
          {/* Document heading */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/25">
                <ScrollText className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                  Official document
                </div>
                <div className="font-serif text-sm font-bold text-slate-900">
                  Handover &amp; Acceptance Agreement
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <div>Retail OS · v3.0</div>
              <div>27 September 2026</div>
            </div>
          </div>

          {/* Executive record */}
          <h2 className="font-serif text-2xl font-semibold text-slate-950">
            Executive record
          </h2>
          <dl className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 text-sm">
            {RECORD.map(([k, v], index) => (
              <div
                key={k}
                className={`grid grid-cols-1 gap-1 px-4 py-3 transition-colors sm:grid-cols-[220px_1fr] ${
                  index % 2 === 0 ? "bg-slate-50/40" : "bg-white"
                } hover:bg-indigo-50/40`}
              >
                <dt className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <Building2 className="h-3 w-3 text-indigo-400" />
                  {k}
                </dt>
                <dd className="font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          {/* Sections */}
          <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-800">
            {SECTIONS.map((s) => (
              <section key={s.title} className="group">
                <h3 className="flex items-start gap-2.5 font-serif text-lg font-semibold text-slate-950">
                  <span className="mt-0.5 h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-orange-500" />
                  {s.title}
                </h3>
                {s.intro && <p className="mt-3 pl-4 text-slate-700">{s.intro}</p>}
                {(s.groups ?? []).map((g, gi) => (
                  <div key={`${s.title}-${g.label ?? gi}`} className="mt-3 pl-4">
                    {g.label && (
                      <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        {g.label}
                      </div>
                    )}
                    <ul className="mt-1.5 space-y-1">
                      {g.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-slate-700">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))}

            {/* Exceptions */}
            <section>
              <h3 className="flex items-start gap-2.5 font-serif text-lg font-semibold text-slate-950">
                <span className="mt-0.5 h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-orange-500" />
                15. OUTSTANDING ITEMS / EXCEPTIONS
              </h3>
              <Textarea
                className="mt-3 border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                rows={5}
                placeholder="Record any written exceptions here."
                value={form.exceptions}
                onChange={(e) => update("exceptions", e.target.value)}
              />
            </section>

            {/* Signatures */}
            <section>
              <h3 className="flex items-start gap-2.5 font-serif text-lg font-semibold text-slate-950">
                <span className="mt-0.5 h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-orange-500" />
                16. SIGNATURES
              </h3>
              <p className="mt-3 pl-4 text-slate-700">
                The undersigned certify that they are authorized representatives of their
                respective parties and agree to the terms contained in this Agreement.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {[
                  {
                    key: "developerOne" as const,
                    label: "Developer 1 name",
                    gradient: "from-indigo-500 to-purple-500",
                    shadow: "shadow-indigo-500/30",
                  },
                  {
                    key: "developerTwo" as const,
                    label: "Developer 2 name",
                    gradient: "from-blue-500 to-indigo-500",
                    shadow: "shadow-blue-500/30",
                  },
                ].map((sig) => (
                  <div
                    key={sig.key}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-4"
                  >
                    <div
                      className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${sig.gradient} opacity-10 blur-xl`}
                    />
                    <div className="relative">
                      <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <PenLine className="h-3.5 w-3.5 text-indigo-500" />
                        {sig.label}
                      </Label>
                      <Input
                        value={form[sig.key]}
                        onChange={(e) => update(sig.key, e.target.value)}
                        className="mt-2 border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="inline-block h-px w-4 bg-slate-300" />
                        Signature · Date: 27 September 2026
                      </p>
                    </div>
                  </div>
                ))}

                <div className="relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/40 p-4 sm:col-span-2">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/15 to-orange-400/15 blur-2xl" />
                  <div className="relative">
                    <Label className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                      <PenLine className="h-3.5 w-3.5" />
                      Client name
                    </Label>
                    <Input
                      value={form.clientSigner}
                      onChange={(e) => update("clientSigner", e.target.value)}
                      className="mt-2 border-amber-100 bg-white shadow-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700">
                      <span className="inline-block h-px w-4 bg-amber-300" />
                      Signature · Date: 27 September 2026
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Certificate of completion */}
            <section className="relative overflow-hidden rounded-2xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-6">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                      Certificate
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-slate-950">
                      Certificate of Completion
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-slate-700">
                  The Developers hereby certify that the TillPoint Retail OS has been successfully
                  designed, developed, deployed and formally handed over to the Client in accordance
                  with the agreed project scope. The Client acknowledges receipt of the delivered
                  software, associated operational workflows and system demonstration, subject only
                  to any written exceptions recorded within this Agreement.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-sm">
                    Project: TillPoint Retail OS
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-2.5 py-1 text-[10px] font-bold text-purple-700 shadow-sm">
                    Version 3.0
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Final
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-bold text-orange-700 shadow-sm">
                    <Calendar className="h-2.5 w-2.5" />
                    27 September 2026
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="text-[11px] text-slate-600">
                Signature names and exceptions are saved locally on this device. Download the
                document to capture the full agreement.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={save}
                className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
              >
                <Save className="mr-2 h-4 w-4" /> Save details
              </Button>
              <Button
                onClick={download}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
              >
                <Download className="mr-2 h-4 w-4" /> Download document
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="relative mt-10">
        <HandoverReceipt />
      </div>
    </div>
  );
}
