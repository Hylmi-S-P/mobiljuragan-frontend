"use client";

import { useState } from "react";
import { AiTelemetryCards } from "@/components/ai/AiTelemetryCards";
import { NineRouterConsoleWidget } from "@/components/ai/NineRouterConsoleWidget";
import { SystemPromptDrawer } from "@/components/ai/SystemPromptDrawer";
import { KnowledgeBaseManager, type KnowledgeCategory } from "@/components/ai/KnowledgeBaseManager";
import { AiChatSandbox } from "@/components/ai/AiChatSandbox";
import type {
  AiConfigData,
  AiGatewayHealth,
  AiGatewayLog,
  KnowledgeDocument,
} from "@/lib/operations";

type Props = {
  healthData: AiGatewayHealth;
  initialLogs: {
    httpLogs: AiGatewayLog[];
    rawLogs: string[];
  };
  config: AiConfigData["config"];
  documents: KnowledgeDocument[];
  activeDocCount: number;
  categories?: KnowledgeCategory[];
};

type TabType = "telemetry" | "rag" | "sandbox";

export function AiHubTabbedWorkspace({
  healthData,
  initialLogs,
  config,
  documents,
  activeDocCount,
  categories = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("telemetry");

  return (
    <div>
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-3">
        <div className="flex items-center gap-1.5 rounded-md border border-rule bg-canvas p-1">
          <button
            type="button"
            onClick={() => setActiveTab("telemetry")}
            className={`flex items-center gap-2 rounded-sm px-4 py-2 text-meta font-medium transition-all ${
              activeTab === "telemetry"
                ? "bg-surface font-semibold text-navy shadow-xs border border-rule/60"
                : "text-ink-soft hover:bg-surface/50 hover:text-ink"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-teal" />
            Monitor
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rag")}
            className={`flex items-center gap-2 rounded-sm px-4 py-2 text-meta font-medium transition-all ${
              activeTab === "rag"
                ? "bg-surface font-semibold text-navy shadow-xs border border-rule/60"
                : "text-ink-soft hover:bg-surface/50 hover:text-ink"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-gold" />
            Refrensi Dokumen (RAG)
            <span className="rounded-full bg-rule px-1.5 py-0.2 text-micro font-bold text-ink-soft">
              {activeDocCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className={`flex items-center gap-2 rounded-sm px-4 py-2 text-meta font-medium transition-all ${
              activeTab === "sandbox"
                ? "bg-surface font-semibold text-navy shadow-xs border border-rule/60"
                : "text-ink-soft hover:bg-surface/50 hover:text-ink"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-navy" />
            Sandbox AI
          </button>
        </div>

        {/* Status gateway sudah dipindahkan ke dalam card Monitor. Sebelumnya
            ditampilkan di sini sebagai enum mentah "HEALTHY" berhuruf kapital,
            yang terbaca seperti kode internal, bukan status untuk manusia. */}
      </div>

      {/* Konten Berdasarkan Tab Aktif.

          Setiap panel sengaja TETAP ter-mount dan hanya disembunyikan lewat kelas
          `hidden`, bukan dilepas dari pohon React. Sebelumnya panel dilepas
          (`activeTab === "x" ? <Panel/> : null`), sehingga berpindah tab membuang
          seluruh state di dalamnya: percakapan sandbox hilang, suntingan system
          prompt yang belum disimpan ikut hilang, dan entri dokumen yang baru
          ditambahkan lenyap dari daftar. Dengan `hidden`, tiap panel mempertahankan
          state-nya masing-masing dan tetap ringan karena tidak ada yang dirender
          ulang saat tab tidak aktif. */}
      <div className="mt-6">
        <div className={activeTab === "telemetry" ? "space-y-6" : "hidden"}>
          <AiTelemetryCards initialHealth={healthData} latestTps={52.4} />
          <NineRouterConsoleWidget
            initialLogs={initialLogs.httpLogs}
            initialRawLogs={initialLogs.rawLogs}
            gatewayUrl={healthData.gatewayUrl}
          />
        </div>

        <div className={activeTab === "rag" ? "space-y-6" : "hidden"}>
          <KnowledgeBaseManager initialDocuments={documents} initialCategories={categories} />
        </div>

        <div className={activeTab === "sandbox" ? "space-y-6" : "hidden"}>
          <SystemPromptDrawer initialConfig={config} activeDocCount={activeDocCount} />
          <AiChatSandbox
            initialTemperature={config.temperature}
            initialMaxTokens={config.maxTokens}
          />
        </div>
      </div>
    </div>
  );
}
