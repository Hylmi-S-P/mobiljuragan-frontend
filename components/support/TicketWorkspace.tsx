"use client";

import { useMemo, useState, useTransition } from "react";

import {
  loadTicketMessagesAction,
  replyToTicketAction,
  takeOverTicketAction,
  updateTicketStatusAction,
} from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  TICKET_STAGE,
  TICKET_STATUS,
  formatTicketCategory,
  ticketStageOf,
} from "@/lib/labels";
import { useDebounce } from "@/lib/useDebounce";
import type { SupportTicketView, TicketMessageView } from "@/lib/operations";
import type { SupportTicketStatus } from "@/lib/types";

type Props = {
  initialTickets: SupportTicketView[];
  initialMessages: TicketMessageView[];
};

function initialOf(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "?";
}

export function TicketWorkspace({ initialTickets, initialMessages }: Props) {
  const [tickets, setTickets] = useState<SupportTicketView[]>(initialTickets);
  const firstTicketId = initialTickets[0]?.id ?? "";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [activeId, setActiveId] = useState(firstTicketId);
  const [messages, setMessages] = useState<TicketMessageView[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSending, startTransition] = useTransition();
  const [isLoadingMessages, startLoadMessages] = useTransition();
  const [isTakingOver, startTakeOver] = useTransition();

  /* Berpindah tiket harus memuat percakapan tiket itu, bukan mempertahankan
     percakapan tiket sebelumnya. Tanpa ini, pesan pelanggan tertukar antar tiket
     dan balasan bisa terkirim ke tiket yang salah. */
  function pilihTiket(ticketId: string) {
    if (ticketId === activeId) return;

    setActiveId(ticketId);
    setMessages([]);
    setDraftError(null);

    startLoadMessages(async () => {
      const hasil = await loadTicketMessagesAction(ticketId);

      // Tiket bisa berpindah lagi selagi permintaan berjalan; hasil yang datang
      // terlambat untuk tiket lama tidak boleh menimpa percakapan tiket aktif.
      setActiveId((idSekarang) => {
        if (idSekarang === ticketId) {
          setMessages(hasil.messages);
          if (hasil.handledBy) {
            setTickets((current) =>
              current.map((t) => (t.id === ticketId ? { ...t, handledBy: hasil.handledBy } : t)),
            );
          }
          if (!hasil.success) {
            setNotice({ text: hasil.message ?? "Percakapan gagal dimuat.", isError: true });
          }
        }
        return idSekarang;
      });
    });
  }

  function handleTakeOver() {
    if (!activeTicket) return;
    startTakeOver(async () => {
      const result = await takeOverTicketAction(activeTicket.id);
      if (result.success) {
        setTickets((current) =>
          current.map((t) => (t.id === activeTicket.id ? { ...t, handledBy: "HUMAN" } : t)),
        );
        setNotice({
          text: result.message ?? "Tiket berhasil diambil alih dari AI. Sekarang Anda dapat membalas pesan pelanggan.",
        });
      } else {
        setNotice({
          text: result.message ?? "Gagal mengambil alih tiket.",
          isError: true,
        });
      }
    });
  }

  const filteredTickets = useMemo(() => {
    const keyword = debouncedQuery.trim().toLowerCase();
    if (keyword.length === 0) return tickets;
    return tickets.filter((ticket) =>
      [ticket.customerLabel, ticket.title, ticket.category, formatTicketCategory(ticket.category)].some((field) =>
        field.toLowerCase().includes(keyword),
      ),
    );
  }, [debouncedQuery, tickets]);

  const activeTicket = tickets.find((ticket) => ticket.id === activeId) ?? null;
  const isResolvedOrClosed = activeTicket?.status === "selesai";
  const isHandledByAi = activeTicket?.handledBy === "AI";
  const tahapAktif = TICKET_STAGE[ticketStageOf(activeTicket?.status ?? "baru")];

  function handleStatusChange(
    newStatus: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED",
  ) {
    if (!activeTicket) return;
    const targetStatusMapped = newStatus === "RESOLVED" || newStatus === "CLOSED" ? "selesai" : "baru";

    startTransition(async () => {
      const result = await updateTicketStatusAction(activeTicket.id, newStatus);
      if (result.success) {
        setTickets((current) =>
          current.map((t) => (t.id === activeTicket.id ? { ...t, status: targetStatusMapped } : t)),
        );
        setNotice({
          text: result.message ?? `Status tiket berhasil diubah menjadi ${newStatus}.`,
        });
      } else {
        setNotice({
          text: result.message ?? "Gagal mengubah status tiket.",
          isError: true,
        });
      }
    });
  }

  function sendReply() {
    if (!activeTicket || isHandledByAi) return;
    const text = draft.trim();
    if (text.length === 0) {
      setDraftError("Balasan tidak boleh kosong.");
      return;
    }

    setDraftError(null);
    setDraft("");

    startTransition(async () => {
      // Balasan tampil lebih dulu, lalu dikirim ke Express lewat Server Action.
      const optimisticMessage: TicketMessageView = {
        id: `optimistic-${Date.now()}`,
        from: "tim",
        text,
        sentAt: new Date().toISOString(),
        senderName: "Tim MobilJuragan",
      };
      setMessages((current) => [...current, optimisticMessage]);

      const result = await replyToTicketAction(activeTicket.id, text);
      if (result.success) {
        setNotice({ text: result.message ?? "Balasan terkirim." });
        setTickets((current) =>
          current.map((t) =>
            t.id === activeTicket.id
              ? { ...t, status: "menunggu_pelanggan", messageCount: t.messageCount + 1 }
              : t,
          ),
        );
      } else {
        // Gagal kirim: tarik kembali pesan optimistis supaya tidak menyesatkan.
        setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
        setDraft(text);
        setDraftError(result.message ?? "Balasan gagal dikirim.");
        setNotice({ text: result.message ?? "Gagal mengirim balasan.", isError: true });
      }
    });
  }

  return (
    <>
      {notice ? (
        <p
          className={`mt-3 rounded-sm border px-3 py-2 text-meta ${
            notice.isError
              ? "border-danger bg-danger/10 text-danger"
              : "border-teal/40 bg-surface text-ink"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="min-w-0">
          <Panel title="Tiket masuk">
            <label htmlFor="ticket-search" className="sr-only">
              Cari tiket
            </label>
            <input
              id="ticket-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari tiket"
              className="h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            />

            <ul className="mt-3 space-y-1.5">
              {filteredTickets.map((ticket) => {
                const active = ticket.id === activeId;
                const tahap = TICKET_STAGE[ticketStageOf(ticket.status)];
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => pilihTiket(ticket.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-start gap-2.5 rounded-sm border px-2.5 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                        active ? "border-teal bg-canvas" : "border-rule hover:bg-canvas"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-body font-semibold text-white"
                      >
                        {initialOf(ticket.customerLabel)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-body font-semibold text-ink">
                            {ticket.customerLabel}
                          </span>
                          <StatusChip tone={tahap.tone}>{tahap.label}</StatusChip>
                          {ticket.handledBy === "AI" ? (
                            <span className="rounded-xs border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-micro font-medium text-amber-800">
                              Bot AI
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-meta text-ink-soft">
                          {ticket.title}
                        </span>
                        <span className="mt-1 block text-meta text-ink-soft">
                          {formatTicketCategory(ticket.category)} · {ticket.messageCount} pesan
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {filteredTickets.length === 0 ? (
              <p className="mt-3 text-meta text-ink-soft">
                {tickets.length === 0
                  ? "Belum ada tiket yang masuk dari pelanggan."
                  : "Tidak ada tiket yang cocok dengan kata kunci itu."}
              </p>
            ) : null}
          </Panel>
        </div>

        <div className="min-w-0">
          <section className="flex min-h-[460px] flex-col rounded-md border border-rule bg-surface">
            {activeTicket ? (
              <>
                <div className="border-b border-rule px-4 py-3">
                  {/* Urutan header: judul tiket paling atas dan paling menonjol, baru
                      identitas pelanggan, status, nomor, dan jenis bantuan. Sebelumnya
                      yang paling menonjol justru nama pelanggan, sementara judul tiket
                      terpisah di blok lain di bawahnya sehingga sulit dipindai. */}
                  <h3 className="text-subtitle font-semibold leading-snug text-ink">
                    {activeTicket.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-meta font-semibold text-white"
                    >
                      {initialOf(activeTicket.customerLabel)}
                    </span>
                    <span className="text-meta font-medium text-ink">
                      {activeTicket.customerLabel}
                    </span>
                    <StatusChip tone={tahapAktif.tone}>{tahapAktif.label}</StatusChip>
                    {activeTicket.handledBy === "AI" ? (
                      <span className="rounded-xs border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-micro font-medium text-amber-800">
                        Ditangani Bot AI
                      </span>
                    ) : null}
                    <span className="text-micro text-ink-soft">{activeTicket.ticketNumber}</span>
                    <span className="text-micro text-ink-soft">
                      {formatTicketCategory(activeTicket.category)}
                    </span>
                  </div>

                  {/* Tombol Aksi Status Tiket Sederhana & Terpusat */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {!isResolvedOrClosed ? (
                      <Button
                        variant="confirm"
                        size="sm"
                        disabled={isSending}
                        onClick={() => handleStatusChange("RESOLVED")}
                      >
                        {isSending ? "Menyelesaikan..." : "Selesaikan & Tutup Tiket"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSending}
                        onClick={() => handleStatusChange("OPEN")}
                      >
                        {isSending ? "Membuka..." : "Buka Kembali Tiket"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {isLoadingMessages ? (
                    <div className="rounded-sm border border-rule bg-canvas px-4 py-6 text-center">
                      <p className="text-body text-ink-soft">Memuat percakapan tiket…</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="rounded-sm border border-rule bg-canvas px-4 py-6 text-center">
                      <p className="text-body font-semibold text-ink">Belum ada pesan</p>
                      <p className="mt-2 text-body text-ink-soft">
                        Pesan pelanggan dan balasan tim akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {messages.map((message) => (
                        <li
                          key={message.id}
                          className={`w-fit max-w-[80%] rounded-md border px-4 py-3 text-body ${
                            message.from === "tim"
                              ? "ml-auto border-teal/40 bg-canvas text-ink"
                              : "border-rule bg-surface text-ink"
                          }`}
                        >
                          {/* Nama admin yang benar-benar membalas ditampilkan di sini,
                              bukan label tim yang seragam. Ini memberi tahu siapa yang
                              menjawab tanpa perlu memisahkan tiket per admin. */}
                          <span className="block text-micro font-semibold uppercase text-ink-soft">
                            {message.from === "tim"
                              ? `oleh ${message.senderName || "Tim"}`
                              : "Pelanggan"}
                          </span>
                          <span className="mt-1 block">{message.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-rule px-4 py-3">
                  {isResolvedOrClosed ? (
                    <div className="rounded-sm border border-rule bg-canvas p-2.5 text-center text-meta text-ink-soft">
                      Tiket ini telah selesai/ditutup. Klik &quot;Buka Kembali Tiket&quot; untuk mengirim balasan lanjutan.
                    </div>
                  ) : (
                    <>
                      {/* Banner Peringatan & Pengambilalihan Tiket yang Ditangani Bot AI */}
                      {isHandledByAi ? (
                        <div className="mb-3 rounded-sm border border-amber-300 bg-amber-50 p-3 text-amber-950">
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                              <span className="text-body font-medium leading-snug">
                                Tiket ini sedang ditangani oleh <strong>Bot AI</strong>. Input balasan dikunci agar tidak terjadi konflik percakapan.
                              </span>
                            </div>
                            <Button
                              variant="confirm"
                              size="sm"
                              disabled={isTakingOver}
                              onClick={handleTakeOver}
                              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-transparent"
                            >
                              {isTakingOver ? "Mengambil Alih..." : "Ambil Alih Tiket"}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {/* Template Balasan Cepat (Canned Responses) */}
                      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-micro font-semibold uppercase text-ink-soft mr-1">
                          Balasan Cepat:
                        </span>
                        <button
                          type="button"
                          disabled={isHandledByAi}
                          onClick={() =>
                            setDraft(
                              "Halo, armada yang Anda tanyakan tersedia dan siap digunakan sesuai jadwal.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Unit Tersedia
                        </button>
                        <button
                          type="button"
                          disabled={isHandledByAi}
                          onClick={() =>
                            setDraft(
                              "Silakan lakukan transfer pelunasan ke rekening resmi Bank BRI 0321-01-002847-53-1 an MobilJuragan Merauke.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Rekening Resmi
                        </button>
                        <button
                          type="button"
                          disabled={isHandledByAi}
                          onClick={() =>
                            setDraft(
                              "Supir resmi kami telah ditugaskan dan akan segera menghubungi nomor Anda sebelum jadwal penjemputan.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Konfirmasi Supir
                        </button>
                      </div>

                      <label htmlFor="ticket-reply" className="sr-only">
                        Tulis balasan
                      </label>
                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        <input
                          id="ticket-reply"
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          disabled={isHandledByAi}
                          placeholder={
                            isHandledByAi
                              ? "Tiket ditangani Bot AI. Klik 'Ambil Alih Tiket' untuk membalas..."
                              : "Tulis balasan solusi resmi ke pelanggan..."
                          }
                          aria-invalid={Boolean(draftError)}
                          aria-describedby={draftError ? "ticket-reply-error" : undefined}
                          className="h-10 min-w-0 flex-1 rounded-sm border border-rule bg-canvas px-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-ink-soft"
                        />
                        <Button
                          variant="confirm"
                          size="md"
                          onClick={sendReply}
                          disabled={isSending || isHandledByAi}
                        >
                          {isSending ? "Mengirim..." : "Kirim Balasan"}
                        </Button>
                      </div>
                      {draftError ? (
                        <p id="ticket-reply-error" className="mt-2 text-meta text-danger">
                          {draftError}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="px-4 py-6">
                <p className="text-body font-semibold text-ink">Belum ada tiket dipilih</p>
                <p className="mt-2 text-body text-ink-soft">
                  Pilih tiket di daftar kiri untuk membaca percakapan dan membalas.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
