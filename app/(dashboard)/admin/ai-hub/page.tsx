import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AiHubTabbedWorkspace } from "@/components/ai/AiHubTabbedWorkspace";
import { getCurrentAdminProfile } from "@/lib/api";
import {
  getAiConfig,
  getKnowledgeDocuments,
  getKnowledgeCategories,
  getAiGatewayHealth,
  getAiGatewayLogs,
  type AiGatewayHealth,
  type AiGatewayLogData,
} from "@/lib/operations";

export const metadata: Metadata = {
  title: "AI HUB | MobilJuragan",
  description:
    "Pusat telemetri AI Gateway, konsol aktivitas live 9Router, manajemen basis pengetahuan RAG, dan sandbox pengujian asisten virtual rental Merauke.",
};

export const dynamic = "force-dynamic";

function AiHubSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-11 w-80 animate-pulse rounded-md border border-rule bg-canvas" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 animate-pulse rounded-card border border-rule bg-surface"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card border border-rule bg-surface" />
    </div>
  );
}

async function AiHubContent() {
  const [aiData, documents, categories, healthData, initialLogs] = await Promise.all([
    getAiConfig(),
    getKnowledgeDocuments(),
    getKnowledgeCategories(),
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
      ragStats={aiData.stats}
      documents={documents}
      categories={categories}
      activeDocCount={activeDocCount}
    />
  );
}

export default async function AiHubPage() {
  const profile = await getCurrentAdminProfile();
  if (profile?.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <Suspense fallback={<AiHubSkeleton />}>
      <AiHubContent />
    </Suspense>
  );
}
