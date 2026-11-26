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
  ragStats?: AiConfigData["stats"];
  documents: KnowledgeDocument[];
  activeDocCount: number;
  categories?: KnowledgeCategory[];
};

type TabType = "telemetry" | "rag" | "sandbox";

export function AiHubTabbedWorkspace({
  healthData,
  initialLogs,
  config,
  ragStats,
  documents,
  activeDocCount,
  categories = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("telemetry");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(() => new Set(["telemetry"]));
  const [liveActiveDocCount, setLiveActiveDocCount] = useState(activeDocCount);

  function selectTab(tab: TabType) {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }

  return (
    <div>
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-3">
        <div className="flex items-center gap-1.5 rounded-md border border-rule bg-canvas p-1">
          <button
            type="button"
            onClick={() => selectTab("telemetry")}
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
            onClick={() => selectTab("rag")}
            className={`flex items-center gap-2 rounded-sm px-4 py-2 text-meta font-medium transition-all ${
              activeTab === "rag"
                ? "bg-surface font-semibold text-navy shadow-xs border border-rule/60"
                : "text-ink-soft hover:bg-surface/50 hover:text-ink"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-gold" />
            Refrensi Dokumen (RAG)
            <span className="rounded-full bg-rule px-1.5 py-0.2 text-micro font-bold text-ink-soft">
              {liveActiveDocCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectTab("sandbox")}
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

          Panel hanya di-mount saat pertama kali dikunjungi, lalu TETAP ter-mount
          dan disembunyikan lewat kelas `hidden` supaya percakapan sandbox, suntingan
          prompt, maupun dokumen yang sedang diedit tidak hilang saat berpindah tab. */}
      <div className="mt-6">
        <div className={activeTab === "telemetry" ? "space-y-6" : "hidden"}>
          <AiTelemetryCards initialHealth={healthData} latestTps={52.4} />
          <NineRouterConsoleWidget
            initialLogs={initialLogs.httpLogs}
            initialRawLogs={initialLogs.rawLogs}
            gatewayUrl={healthData.gatewayUrl}
            isActive={activeTab === "telemetry"}
          />
        </div>

        {visitedTabs.has("rag") ? (
          <div className={activeTab === "rag" ? "space-y-6" : "hidden"}>
            <KnowledgeBaseManager
              initialDocuments={documents}
              initialCategories={categories}
              initialRagStats={ragStats}
              onActiveCountChange={setLiveActiveDocCount}
            />
          </div>
        ) : null}

        {visitedTabs.has("sandbox") ? (
          <div className={activeTab === "sandbox" ? "space-y-6" : "hidden"}>
            <SystemPromptDrawer initialConfig={config} activeDocCount={liveActiveDocCount} />
            <AiChatSandbox
              initialTemperature={config.temperature}
              initialMaxTokens={config.maxTokens}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
