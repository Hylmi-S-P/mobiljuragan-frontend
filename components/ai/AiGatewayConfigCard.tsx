"use client";

import { useState, useTransition } from "react";
import { updateAiConfigAction, fetchGatewayModelsAction } from "@/app/actions";
import { IconSparkles } from "@/components/ui/icons";
import type { AiConfigData } from "@/lib/operations";

type Props = {
  initialConfig: AiConfigData["config"];
  stats: AiConfigData["stats"];
};

export function AiGatewayConfigCard({ initialConfig, stats }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const [gatewayUrl, setGatewayUrl] = useState(initialConfig.gatewayUrl);
  const [apiKey, setApiKey] = useState(initialConfig.apiKey || "");
  const [activeModel, setActiveModel] = useState(initialConfig.activeModel);
  const [systemPrompt, setSystemPrompt] = useState(initialConfig.systemPrompt);
  const [temperature, setTemperature] = useState(initialConfig.temperature);
  const [maxTokens, setMaxTokens] = useState(initialConfig.maxTokens);
  const [enableRag, setEnableRag] = useState(initialConfig.enableRag);

  const [availableModels, setAvailableModels] = useState<string[]>([
    initialConfig.activeModel,
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "claude-3-5-sonnet",
    "deepseek-chat",
    "gpt-4o-mini",
  ]);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setMessage(null);
    try {
      const res = await fetchGatewayModelsAction(gatewayUrl, apiKey);
      if (res.data?.models && res.data.models.length > 0) {
        // Gabungkan dan hilangkan duplikat
        const unique = Array.from(new Set([activeModel, ...res.data.models]));
        setAvailableModels(unique);
        setMessage({
          type: "success",
          text: `Berhasil mengambil ${res.data.count} model dari ${res.data.source === "live_gateway" ? "AI Gateway Aktif" : "Katalog Standar"}.`,
        });
      }
    } catch {
      setMessage({ type: "error", text: "Gagal mengambil daftar model dari gateway." });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData();
    formData.append("gatewayUrl", gatewayUrl);
    formData.append("apiKey", apiKey);
    formData.append("activeModel", activeModel);
    formData.append("systemPrompt", systemPrompt);
    formData.append("temperature", String(temperature));
    formData.append("maxTokens", String(maxTokens));
    if (enableRag) formData.append("enableRag", "on");

    startTransition(async () => {
      const res = await updateAiConfigAction(null, formData);
      if (res.success) {
        setMessage({ type: "success", text: res.message || "Konfigurasi AI berhasil disimpan." });
      } else {
        setMessage({ type: "error", text: res.message || "Gagal menyimpan konfigurasi AI." });
      }
    });
  };

  // Bersihkan base URL untuk link eksternal web UI (hapus /v1 jika ada)
  const dashboardRouterUrl = gatewayUrl.replace(/\/v1\/?$/, "");

  return (
    <div className="rounded-card border border-rule bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-rule pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/15 text-teal">
            <IconSparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-body font-semibold text-ink">
              Koneksi AI Gateway (9Router / OpenAI-Compatible)
            </h2>
            <p className="text-meta text-ink-soft">
              Hubungkan dashboard dengan router multi-provider (9Router, LiteLLM, atau OpenRouter).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={dashboardRouterUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-button border border-rule bg-canvas px-3 py-1.5 text-meta font-medium text-ink transition-colors hover:bg-canvas-subtle"
            title="Buka dashboard bawaan 9Router di tab baru"
          >
            <span>Buka Web UI 9Router</span>
            <span className="text-xs text-ink-soft">↗</span>
          </a>
        </div>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-md p-3 text-meta ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Gateway Base URL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gatewayUrl" className="text-meta font-semibold text-ink">
              Gateway Base URL
            </label>
            <input
              id="gatewayUrl"
              type="text"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="http://localhost:20128/v1"
              required
              className="rounded-button border border-rule bg-white px-3 py-2 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
            />
            <span className="text-micro text-ink-soft">
              Port standar 9Router adalah <code className="bg-canvas px-1 rounded">20128</code> atau port LiteLLM <code className="bg-canvas px-1 rounded">4000</code>.
            </span>
          </div>

          {/* Gateway API Key */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="apiKey" className="text-meta font-semibold text-ink">
              Gateway API Key (Opsional)
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Kosongkan jika router lokal tidak memakai auth"
              className="rounded-button border border-rule bg-white px-3 py-2 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
            />
            <span className="text-micro text-ink-soft">
              Bearer token untuk gateway terproteksi atau API key OpenRouter.
            </span>
          </div>
        </div>

        {/* Model Selection & Fetch Button */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="activeModel" className="text-meta font-semibold text-ink">
                Model AI Aktif
              </label>
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels}
                className="text-micro font-medium text-teal hover:underline disabled:opacity-50"
              >
                {isFetchingModels ? "Mengambil model..." : "↻ Tarik Model dari Gateway"}
              </button>
            </div>
            <div className="flex gap-2">
              <select
                id="activeModel"
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="flex-1 rounded-button border border-rule bg-white px-3 py-2 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-micro text-ink-soft">
              Pilih model individual atau alias <strong>Model Combo</strong> yang sudah dikonfigurasi di 9Router (mis. <code>gemini-2.5-flash</code>, <code>claude-3-5-sonnet</code>, atau combo kustom).
            </span>
          </div>

          {/* Input Manual Nama Model Jika Belum Masuk Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customModel" className="text-meta font-semibold text-ink">
              Ketik Model Kustom
            </label>
            <input
              id="customModel"
              type="text"
              placeholder="Ketik slug model baru..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = (e.currentTarget.value || "").trim();
                  if (val && !availableModels.includes(val)) {
                    setAvailableModels([val, ...availableModels]);
                    setActiveModel(val);
                    e.currentTarget.value = "";
                  }
                }
              }}
              className="rounded-button border border-rule bg-white px-3 py-2 text-body text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
            />
            <span className="text-micro text-ink-soft">
              Tekan Enter untuk menambahkan ke daftar pilihan.
            </span>
          </div>
        </div>

        {/* Hyperparameters: Temperature & Max Tokens */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Temperature Slider */}
          <div className="rounded-md border border-rule/70 bg-canvas/40 p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="temperature" className="text-meta font-semibold text-ink">
                Kreativitas / Temperature
              </label>
              <span className="rounded bg-surface px-2 py-0.5 text-meta font-bold tabular-nums text-navy border border-rule">
                {temperature}
              </span>
            </div>
            <input
              id="temperature"
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="mt-3 w-full accent-teal cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-micro text-ink-soft">
              <span>0.0 (Presisi/Faktual)</span>
              <span>1.0 (Kreatif)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="rounded-md border border-rule/70 bg-canvas/40 p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="maxTokens" className="text-meta font-semibold text-ink">
                Batas Panjang Jawaban (Max Tokens)
              </label>
              <span className="rounded bg-surface px-2 py-0.5 text-meta font-bold tabular-nums text-navy border border-rule">
                {maxTokens}
              </span>
            </div>
            <input
              id="maxTokens"
              type="number"
              min="100"
              max="4096"
              step="50"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1000)}
              className="mt-3 w-full rounded-button border border-rule bg-white px-3 py-1.5 text-body text-ink outline-none focus:border-teal"
            />
            <span className="mt-1 block text-micro text-ink-soft">
              Standar 1000 token cukup untuk jawaban 2-3 paragraf lengkap.
            </span>
          </div>
        </div>

        {/* System Prompt & Persona */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="systemPrompt" className="text-meta font-semibold text-ink">
            Instruksi Sistem & Persona Asisten (System Prompt)
          </label>
          <textarea
            id="systemPrompt"
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            required
            className="rounded-button border border-rule bg-white p-3 font-mono text-meta text-ink outline-none focus:border-teal focus:ring-1 focus:ring-teal"
          />
          <span className="text-micro text-ink-soft">
            Menentukan kepribadian, nada bicara ramah, dan batasan operasional asisten rental Merauke.
          </span>
        </div>

        {/* Toggle RAG Knowledge Base */}
        <div className="flex items-center justify-between rounded-md border border-rule/70 bg-canvas/50 p-4">
          <div className="flex flex-col">
            <span className="text-meta font-semibold text-ink">
              Injeksi Dokumen Basis Pengetahuan (RAG Context)
            </span>
            <span className="text-micro text-ink-soft">
              Secara otomatis menyertakan {stats.activeDocumentCount} dokumen aktif ke prompt sistem saat bot menjawab.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableRag}
              onChange={(e) => setEnableRag(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-canvas-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-rule after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal"></div>
          </label>
        </div>

        {/* Arsitektur 9Router Native Model Combo */}
        <div className="rounded-md border border-teal/20 bg-teal/5 p-4 text-meta text-ink leading-relaxed">
          <div className="flex items-start gap-3">
            <span className="text-teal font-bold text-base mt-0.5">💡</span>
            <div className="flex-1 text-sm">
              <span className="font-semibold text-ink">Fitur Bawaan 9Router Model Combo:</span> Untuk mengaktifkan failover otomatis upstream terdistribusi (misalnya saat provider primer mengalami lonjakan traffic HTTP 429), cukup buat <strong>Combo</strong> di Web UI 9Router lalu arahkan Model Aktif di atas ke nama combo tersebut. 9Router secara mandiri menangani antrean retry dan rotasi penyedia cadangan tanpa intervensi manual di dashboard ini.
            </div>
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-button bg-navy px-5 py-2.5 text-body font-semibold text-white shadow-sm transition-colors hover:bg-navy-hover disabled:opacity-50"
          >
            {isPending ? "Menyimpan Konfigurasi..." : "Simpan Pengaturan AI"}
          </button>
        </div>
      </form>
    </div>
  );
}
