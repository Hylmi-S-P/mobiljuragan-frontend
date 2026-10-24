"use client";

import { useMemo, useState, useTransition } from "react";

import {
  loadTicketMessagesAction,
  replyToTicketAction,
  updateTicketStatusAction,
} from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { TICKET_STATUS, formatTicketCategory } from "@/lib/labels";
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
          if (!hasil.success) {
            setNotice({ text: hasil.message ?? "Percakapan gagal dimuat.", isError: true });
          }
        }
        return idSekarang;
      });
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
    if (!activeTicket) return;
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
                const status = TICKET_STATUS[ticket.status as SupportTicketStatus] ?? {
                  label: ticket.status,
                  tone: "neutral" as const,
                };
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
                          <StatusChip tone={status.tone}>{status.label}</StatusChip>
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
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-rule px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-body font-semibold text-white"
                    >
                      {initialOf(activeTicket.customerLabel)}
                    </span>
                    <span className="text-body font-semibold text-ink">
                      {activeTicket.customerLabel}
                    </span>
                    <StatusChip
                      tone={
                        (TICKET_STATUS[activeTicket.status as SupportTicketStatus] ?? {
                          tone: "neutral" as const,
                        }).tone
                      }
                    >
                      {
                        (TICKET_STATUS[activeTicket.status as SupportTicketStatus] ?? {
                          label: activeTicket.status,
                        }).label
                      }
                    </StatusChip>
                  </div>

                  {/* Tombol Aksi Status Tiket Sederhana & Terpusat */}
                  <div className="flex flex-wrap items-center gap-2">
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

                <div className="border-b border-rule px-4 py-3">
                  <h3 className="text-body font-semibold text-ink">Informasi tiket</h3>
                  <dl className="mt-2 grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <dt className="text-micro font-bold uppercase text-ink-soft">Judul tiket</dt>
                      <dd className="mt-1 text-meta text-ink">{activeTicket.title}</dd>
                    </div>
                    <div>
                      <dt className="text-micro font-bold uppercase text-ink-soft">
                        Jenis bantuan
                      </dt>
                      <dd className="mt-1 text-meta font-medium text-ink">
                        {formatTicketCategory(activeTicket.category)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-micro font-bold uppercase text-ink-soft">Nomor tiket</dt>
                      <dd className="mt-1 text-meta text-ink">{activeTicket.ticketNumber}</dd>
                    </div>
                  </dl>
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
                          <span className="block text-micro font-semibold uppercase text-ink-soft">
                            {message.from === "tim" ? "Tim MobilJuragan" : "Pelanggan"}
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
                      {/* Template Balasan Cepat (Canned Responses) */}
                      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-micro font-semibold uppercase text-ink-soft mr-1">
                          Balasan Cepat:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft(
                              "Halo, armada yang Anda tanyakan tersedia dan siap digunakan sesuai jadwal.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy"
                        >
                          + Unit Tersedia
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft(
                              "Silakan lakukan transfer pelunasan ke rekening resmi BCA 1234567890 a/n CV Mobil Juragan Express Transport.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy"
                        >
                          + Rekening Resmi
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft(
                              "Supir resmi kami telah ditugaskan dan akan segera menghubungi nomor Anda sebelum jadwal penjemputan.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy"
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
                          placeholder="Tulis balasan solusi resmi ke pelanggan..."
                          aria-invalid={Boolean(draftError)}
                          aria-describedby={draftError ? "ticket-reply-error" : undefined}
                          className="h-10 min-w-0 flex-1 rounded-sm border border-rule bg-canvas px-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                        <Button variant="confirm" size="md" onClick={sendReply} disabled={isSending}>
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
