import type { Metadata } from "next";
import { AiHubTabbedWorkspace } from "@/components/ai/AiHubTabbedWorkspace";
import {
  getAiConfig,
  getKnowledgeDocuments,
  getAiGatewayHealth,
  getAiGatewayLogs,
  type AiGatewayHealth,
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
    <AiHubTabbedWorkspace
      healthData={healthData}
      initialLogs={initialLogs}
      config={aiData.config}
      documents={documents}
      activeDocCount={activeDocCount}
    />
  );
}
