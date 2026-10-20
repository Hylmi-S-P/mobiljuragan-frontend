import type { Metadata } from "next";
import { AiTelemetryCards } from "@/components/ai/AiTelemetryCards";
import { NineRouterConsoleWidget } from "@/components/ai/NineRouterConsoleWidget";
import { SystemPromptDrawer } from "@/components/ai/SystemPromptDrawer";
import { KnowledgeBaseManager } from "@/components/ai/KnowledgeBaseManager";
import { AiChatSandbox } from "@/components/ai/AiChatSandbox";
import {
  getAiConfig,
  getKnowledgeDocuments,
  getAiGatewayHealth,
  getAiGatewayLogs,
  type AiGatewayHealth,
  type AiGatewayLog,
  type AiGatewayLogData,
} from "@/lib/operations";

export const metadata: Metadata = {
  title: "AI & RAG Hub | MobilJuragan",
  description:
    "Pusat telemetri AI Gateway, konsol aktivitas live 9Router, manajemen basis pengetahuan RAG, dan sandbox pengujian asisten virtual rental Merauke.",
};

export const dynamic = "force-dynamic";

export default async function AiHubPage() {
  const [aiData, documents, healthData, initialLogs] = await Promise.all([
    getAiConfig(),
    getKnowledgeDocuments(),
    getAiGatewayHealth().catch((): AiGatewayHealth => ({
      healthStatus: "OFFLINE",
      statusCode: 0,
      latencyMs: 0,
      message: "Gateway belum terhubung pada port lokal.",
      checkedAt: new Date().toISOString(),
      gatewayUrl: "http://localhost:20128/v1",
      activeModel: "MJ",
      fallbackModel: "MJ",
      autoFallbackEnabled: true,
      proxyUrl: "",
    })),
    getAiGatewayLogs().catch((): AiGatewayLogData => ({ httpLogs: [], rawLogs: [] })),
  ]);

  const activeDocCount = documents.filter((d) => d.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Tiga Kartu Telemetri Operasional (Model Aktif, Latensi Respon TTFT, Kecepatan Token/s) */}
      <AiTelemetryCards
        initialHealth={healthData}
        latestTps={52.4}
      />

      {/* 2. Live Console Trace 9Router (Terminal Log Aktivitas Gateway) */}
      <NineRouterConsoleWidget
        initialLogs={initialLogs.httpLogs}
        initialRawLogs={initialLogs.rawLogs}
        gatewayUrl={healthData.gatewayUrl}
      />

      {/* 3. Instruksi Sistem & Persona Asisten (Injeksi Konteks Rental Merauke) */}
      <SystemPromptDrawer
        initialConfig={aiData.config}
        activeDocCount={activeDocCount}
      />

      {/* 4. Manajemen Basis Pengetahuan RAG (Upload Berkas Dokumen & Input Manual) */}
      <KnowledgeBaseManager initialDocuments={documents} />

      {/* 5. Sandbox Uji Chatbot (Live Model & RAG Simulator) */}
      <AiChatSandbox
        initialTemperature={aiData.config.temperature}
        initialMaxTokens={aiData.config.maxTokens}
      />
    </div>
  );
}
