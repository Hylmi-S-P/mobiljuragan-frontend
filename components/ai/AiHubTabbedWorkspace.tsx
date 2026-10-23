"use client";

import { useState } from "react";
import { AiTelemetryCards } from "@/components/ai/AiTelemetryCards";
import { NineRouterConsoleWidget } from "@/components/ai/NineRouterConsoleWidget";
import { SystemPromptDrawer } from "@/components/ai/SystemPromptDrawer";
import { KnowledgeBaseManager } from "@/components/ai/KnowledgeBaseManager";
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
};

type TabType = "telemetry" | "rag" | "sandbox";

export function AiHubTabbedWorkspace({
  healthData,
  initialLogs,
  config,
  documents,
  activeDocCount,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("telemetry");

  const isHealthy = healthData.healthStatus === "HEALTHY";

  return (
    <div className="space-y-6">
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
            Telemetri &amp; Console
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
            Basis Pengetahuan RAG
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
            Prompt &amp; Sandbox Uji
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-micro text-ink-soft">
          <span className="font-semibold text-ink">Status Gateway:</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
              isHealthy
                ? "bg-teal/10 text-teal"
                : "bg-danger/10 text-danger"
            }`}
          >
            {healthData.healthStatus}
          </span>
        </div>
      </div>

      {/* Konten Berdasarkan Tab Aktif */}
      {activeTab === "telemetry" ? (
        <div className="space-y-6">
          <AiTelemetryCards initialHealth={healthData} latestTps={52.4} />
          <NineRouterConsoleWidget
            initialLogs={initialLogs.httpLogs}
            initialRawLogs={initialLogs.rawLogs}
            gatewayUrl={healthData.gatewayUrl}
          />
        </div>
      ) : null}

      {activeTab === "rag" ? (
        <div className="space-y-6">
          <KnowledgeBaseManager initialDocuments={documents} />
        </div>
      ) : null}

      {activeTab === "sandbox" ? (
        <div className="space-y-6">
          <SystemPromptDrawer initialConfig={config} activeDocCount={activeDocCount} />
          <AiChatSandbox
            initialTemperature={config.temperature}
            initialMaxTokens={config.maxTokens}
          />
        </div>
      ) : null}
    </div>
  );
}
