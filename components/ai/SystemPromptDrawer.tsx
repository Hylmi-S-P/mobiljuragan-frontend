"use client";

import { useState, useTransition } from "react";
import { updateAiConfigAction } from "@/app/actions";
import { IconSparkles } from "@/components/ui/icons";
import type { AiConfigData } from "@/lib/operations";

type Props = {
  initialConfig: AiConfigData["config"];
  activeDocCount: number;
};

export function SystemPromptDrawer({ initialConfig, activeDocCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [systemPrompt, setSystemPrompt] = useState(initialConfig.systemPrompt);
  const [enableRag, setEnableRag] = useState(initialConfig.enableRag);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = () => {
    setFeedback(null);
    const formData = new FormData();
    formData.append("gatewayUrl", initialConfig.gatewayUrl);
    formData.append("apiKey", initialConfig.apiKey || "");
    formData.append("activeModel", initialConfig.activeModel);
    formData.append("systemPrompt", systemPrompt);
    formData.append("temperature", String(initialConfig.temperature));
    formData.append("maxTokens", String(initialConfig.maxTokens));
    if (enableRag) formData.append("enableRag", "on");

    startTransition(async () => {
      const res = await updateAiConfigAction(null, formData);
      if (res.success) {
        setFeedback("Persona & instruksi sistem berhasil disimpan.");
      } else {
        setFeedback(res.message || "Gagal menyimpan persona.");
      }
    });
  };

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-rule pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/15 text-teal">
            <IconSparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-body font-semibold text-ink">
              Instruksi Sistem &amp; Persona Asisten (System Prompt)
            </h2>
            <p className="text-meta text-ink-soft">
              Panduan nada bicara, batasan operasional, dan injeksi konteks rental Merauke ke prompt model.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="self-start rounded-button bg-navy px-4 py-1.5 text-meta font-semibold text-white hover:bg-navy-hover transition-colors disabled:opacity-50 sm:self-auto"
        >
          {isPending ? "Menyimpan..." : "Simpan Persona"}
        </button>
      </div>

      {feedback ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-meta text-emerald-800">
          {feedback}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {/* RAG Injection Toggle Bar */}
        <div className="flex items-center justify-between rounded-md border border-rule/70 bg-canvas/40 px-3 py-2">
          <span className="text-meta font-medium text-ink">
            Injeksi Dokumen RAG ({activeDocCount} Aktif):
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableRag}
              onChange={(e) => setEnableRag(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-canvas-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-rule after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal"></div>
          </label>
        </div>

        {/* Textarea Persona */}
        <div className="flex flex-col gap-1.5">
          <textarea
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Tuliskan persona asisten di sini..."
            className="rounded-button border border-rule bg-white p-3 font-mono text-meta text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
          />
          <span className="text-micro text-ink-soft">
            Tip: Instruksi ini akan digabungkan secara otomatis dengan ringkasan dokumen basis pengetahuan RAG aktif saat bot menjawab pertanyaan pelanggan.
          </span>
        </div>
      </div>
    </div>
  );
}
